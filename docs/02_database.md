# 02 — Database Schema (Supabase / PostgreSQL)

App name: **Bubbl**

---

## Run Order

Run these in the Supabase SQL Editor in this exact order:
1. `schema/migrations/001_initial.sql` — all tables, indexes, RLS

---

## Tables Overview

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user — extends Supabase auth.users |
| `questions` | Pre-seeded question bank (5,000 questions, read-only at runtime) |
| `papers` | Each assembled practice session |
| `attempts` | Each completed paper with per-question results |
| `domain_ability` | Per-user per-domain ability score (the adaptive engine state) |
| `gap_profile` | Aggregated mastery % per domain, updated by Claude gap analysis |
| `seen_questions` | Tracks which questions each user has already answered |

---

## Full Schema

```sql
-- ============================================================
-- BUBBL — Database Schema v1.0
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- Extends Supabase auth.users. Created automatically on signup
-- via a database trigger (see trigger section below).
-- ============================================================
create table public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  name                text,
  grade               smallint check (grade between 9 and 12),
  target_score        smallint check (target_score between 400 and 1600),
  plan                text not null default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id  text unique,
  stripe_subscription_id text unique,
  subscription_end_at timestamptz,
  papers_this_week    smallint not null default 0,
  week_reset_at       timestamptz not null default date_trunc('week', now()) + interval '7 days',
  diagnostic_done     boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-reset weekly paper count
create or replace function public.reset_weekly_papers()
returns void as $$
begin
  update public.profiles
  set papers_this_week = 0,
      week_reset_at = date_trunc('week', now()) + interval '7 days'
  where week_reset_at <= now();
end;
$$ language plpgsql security definer;

-- ============================================================
-- 2. QUESTIONS (pre-seeded, read-only at runtime)
-- ============================================================
create table public.questions (
  id               uuid primary key default gen_random_uuid(),

  -- Classification
  subject          text not null check (subject in ('math', 'english')),
  domain           text not null,
  -- Math domains:    'Algebra' | 'Advanced Math' | 'PSDA' | 'Geometry'
  -- English domains: 'Craft & Structure' | 'Information & Ideas' | 'SEC' | 'Expression'

  skill            text not null,
  -- e.g. 'Scatterplot' | 'Vocabulary in context' | 'Dangling modifier'

  cb_skill_code    text not null,
  -- e.g. 'PSA-01' | 'CS-02' | 'ALG-05' (see docs/06_question_bank.md)

  -- Difficulty
  difficulty       text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Hardest')),
  difficulty_rating smallint not null check (difficulty_rating in (300, 500, 650, 800)),
  -- Easy=300, Medium=500, Hard=650, Hardest=800

  -- Question content
  passage          text,           -- null for most math; required for all english
  stem             text not null,
  choices          jsonb,          -- {"A":"...","B":"...","C":"...","D":"..."} or null if grid_in
  grid_in          boolean not null default false,
  correct          text not null,  -- 'A'|'B'|'C'|'D' or numeric string for grid-in
  explanation      text not null,
  trap_choice      text,           -- most common wrong answer choice
  strategy         text,           -- 800-level strategy tip

  -- Calibration (updated as real students answer)
  times_seen       int not null default 0,
  times_correct    int not null default 0,
  pass_rate        float,          -- recomputed after 50+ attempts

  created_at       timestamptz not null default now()
);

-- Indexes for fast paper assembly
create index idx_questions_subject_domain_rating
  on questions (subject, domain, difficulty_rating);

create index idx_questions_subject_skill_rating
  on questions (subject, skill, difficulty_rating);

create index idx_questions_cb_skill
  on questions (cb_skill_code);

-- ============================================================
-- 3. SEEN QUESTIONS
-- Tracks which questions a user has already been served.
-- Used to ensure no repeats.
-- ============================================================
create table public.seen_questions (
  user_id     uuid references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  answered_at timestamptz not null default now(),
  was_correct boolean,
  primary key (user_id, question_id)
);

create index idx_seen_questions_user on seen_questions (user_id);

-- ============================================================
-- 4. PAPERS
-- One row per assembled practice session.
-- ============================================================
create table public.papers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  subject        text not null check (subject in ('math', 'english', 'combined')),
  focus          text,    -- null = auto (gap-driven) | 'psda' | 'vocab' | 'geometry' etc.
  question_ids   uuid[] not null,  -- ordered list of question IDs in this paper
  question_count smallint not null,
  status         text not null default 'in_progress'
                 check (status in ('in_progress', 'completed', 'abandoned')),
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index idx_papers_user on papers (user_id, started_at desc);

-- ============================================================
-- 5. ATTEMPTS
-- Per-question results for a completed paper.
-- ============================================================
create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  paper_id         uuid references public.papers(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete cascade,

  -- Aggregate scores
  total_questions  smallint not null,
  correct_count    smallint not null,
  score_pct        float not null,   -- 0.0–1.0
  time_taken_secs  int,

  -- Per-question breakdown (stored as JSONB for flexibility)
  question_results jsonb not null,
  -- Array of:
  -- {
  --   question_id: "uuid",
  --   domain: "PSDA",
  --   skill: "Scatterplot",
  --   difficulty: "Medium",
  --   difficulty_rating: 500,
  --   answer_given: "B",
  --   correct_answer: "C",
  --   was_correct: false,
  --   time_taken_secs: 47,
  --   ability_before: 420,
  --   ability_after: 390
  -- }

  -- Domain breakdown (denormalized for fast gap analysis)
  domain_results   jsonb not null,
  -- {
  --   "PSDA":         { correct: 2, total: 5, avg_time: 89 },
  --   "Algebra":      { correct: 4, total: 5, avg_time: 34 },
  --   "Advanced Math":{ correct: 3, total: 5, avg_time: 61 },
  --   "Geometry":     { correct: 2, total: 4, avg_time: 72 }
  -- }

  completed_at     timestamptz not null default now()
);

create index idx_attempts_user on attempts (user_id, completed_at desc);
create index idx_attempts_paper on attempts (paper_id);

-- ============================================================
-- 6. DOMAIN ABILITY
-- The adaptive engine state: one row per user per domain.
-- Updated after every answered question.
-- ============================================================
create table public.domain_ability (
  user_id        uuid references public.profiles(id) on delete cascade,
  domain         text not null,
  ability        smallint not null default 500
                 check (ability between 200 and 800),
  questions_seen int not null default 0,
  last_question_correct boolean,
  updated_at     timestamptz not null default now(),
  primary key (user_id, domain)
);

-- Seed initial domain_ability rows on profile creation
create or replace function public.seed_domain_ability()
returns trigger as $$
declare
  domains text[] := array[
    'Algebra', 'Advanced Math', 'PSDA', 'Geometry',
    'Craft & Structure', 'Information & Ideas', 'SEC', 'Expression'
  ];
  d text;
begin
  foreach d in array domains loop
    insert into public.domain_ability (user_id, domain, ability)
    values (new.id, d, 500);
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.seed_domain_ability();

-- ============================================================
-- 7. GAP PROFILE
-- Claude Haiku analysis results. Updated every 3 papers.
-- ============================================================
create table public.gap_profile (
  user_id              uuid references public.profiles(id) on delete cascade primary key,

  -- Mastery scores 0–100 per domain (from Claude analysis)
  math_algebra         smallint default null,
  math_advanced        smallint default null,
  math_psda            smallint default null,
  math_geometry        smallint default null,
  english_craft        smallint default null,
  english_info         smallint default null,
  english_sec          smallint default null,
  english_expression   smallint default null,

  -- Overall estimated SAT score range
  estimated_score_low  smallint,
  estimated_score_high smallint,

  -- Top gaps from Claude
  top_gaps             jsonb,
  -- [
  --   { "domain": "PSDA", "score": 45,
  --     "insight": "Percent chain questions failing consistently" },
  --   { "domain": "Craft & Structure", "score": 38,
  --     "insight": "Vocabulary: confusing register with meaning" }
  -- ]

  recommended_next     text,   -- 'math psda' | 'english vocab' | etc.
  encouragement        text,   -- one sentence from Claude
  papers_since_update  smallint not null default 0,
  updated_at           timestamptz not null default now()
);

-- Seed gap_profile row on profile creation
create or replace function public.seed_gap_profile()
returns trigger as $$
begin
  insert into public.gap_profile (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_gap
  after insert on public.profiles
  for each row execute function public.seed_gap_profile();
```

---

## Row Level Security Policies

```sql
-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.questions      enable row level security;
alter table public.seen_questions enable row level security;
alter table public.papers         enable row level security;
alter table public.attempts       enable row level security;
alter table public.domain_ability enable row level security;
alter table public.gap_profile    enable row level security;

-- ============================================================
-- PROFILES — user can only see/edit their own row
-- ============================================================
create policy "profiles: own row only"
  on public.profiles for all
  using (auth.uid() = id);

-- ============================================================
-- QUESTIONS — everyone can read, nobody can write from client
-- ============================================================
create policy "questions: public read"
  on public.questions for select
  using (true);

-- No insert/update/delete policy = blocked by default

-- ============================================================
-- SEEN QUESTIONS — own rows only
-- ============================================================
create policy "seen_questions: own rows only"
  on public.seen_questions for all
  using (auth.uid() = user_id);

-- ============================================================
-- PAPERS — own papers only
-- ============================================================
create policy "papers: own papers only"
  on public.papers for all
  using (auth.uid() = user_id);

-- ============================================================
-- ATTEMPTS — own attempts only
-- ============================================================
create policy "attempts: own attempts only"
  on public.attempts for all
  using (auth.uid() = user_id);

-- ============================================================
-- DOMAIN ABILITY — own rows only
-- ============================================================
create policy "domain_ability: own rows only"
  on public.domain_ability for all
  using (auth.uid() = user_id);

-- ============================================================
-- GAP PROFILE — own row only
-- ============================================================
create policy "gap_profile: own row only"
  on public.gap_profile for all
  using (auth.uid() = user_id);
```

---

## Weekly Paper Reset (Cron)

Free users get 2 papers/week. Reset the counter every Monday at midnight UTC.

Set this up in Supabase Dashboard → Database → Extensions → pg_cron:

```sql
-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Reset weekly paper count every Monday at 00:00 UTC
select cron.schedule(
  'reset-weekly-papers',
  '0 0 * * 1',
  $$ select public.reset_weekly_papers(); $$
);
```

---

## Question Bank Calibration Update

After a question gets 50+ answers, recalculate its pass_rate:

```sql
-- Run nightly via pg_cron
create or replace function public.recalibrate_questions()
returns void as $$
begin
  update public.questions
  set pass_rate = times_correct::float / times_seen
  where times_seen >= 50;
end;
$$ language plpgsql security definer;

select cron.schedule(
  'recalibrate-questions',
  '0 2 * * *',   -- 2am UTC daily
  $$ select public.recalibrate_questions(); $$
);
```
