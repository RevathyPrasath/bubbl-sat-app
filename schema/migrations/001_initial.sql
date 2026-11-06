-- ============================================================
-- BUBBL — Initial Database Migration
-- Version: 001
-- Run this in Supabase SQL Editor (once, in order)
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id                     uuid references auth.users(id) on delete cascade primary key,
  name                   text,
  grade                  smallint check (grade between 9 and 12),
  target_score           smallint check (target_score between 400 and 1600),
  plan                   text not null default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  subscription_end_at    timestamptz,
  papers_this_week       smallint not null default 0,
  week_reset_at          timestamptz not null default (date_trunc('week', now()) + interval '7 days'),
  diagnostic_done        boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reset weekly paper count
create or replace function public.reset_weekly_papers()
returns void as $$
begin
  update public.profiles
  set papers_this_week = 0,
      week_reset_at    = date_trunc('week', now()) + interval '7 days'
  where week_reset_at <= now();
end;
$$ language plpgsql security definer;

-- ============================================================
-- 2. QUESTIONS
-- ============================================================
create table public.questions (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null check (subject in ('math', 'english')),
  domain           text not null,
  skill            text not null,
  cb_skill_code    text not null,
  difficulty       text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Hardest')),
  difficulty_rating smallint not null check (difficulty_rating in (300, 500, 650, 800)),
  passage          text,
  stem             text not null,
  choices          jsonb,
  grid_in          boolean not null default false,
  correct          text not null,
  explanation      text not null,
  trap_choice      text,
  strategy         text,
  times_seen       int not null default 0,
  times_correct    int not null default 0,
  pass_rate        float,
  created_at       timestamptz not null default now()
);

create index idx_questions_main
  on questions (subject, domain, difficulty_rating);

create index idx_questions_skill
  on questions (subject, skill, difficulty_rating);

create index idx_questions_cb_code
  on questions (cb_skill_code);

-- ============================================================
-- 3. SEEN QUESTIONS
-- ============================================================
create table public.seen_questions (
  user_id     uuid references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  was_correct boolean,
  answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index idx_seen_user on seen_questions (user_id);

-- ============================================================
-- 4. PAPERS
-- ============================================================
create table public.papers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  subject        text not null check (subject in ('math', 'english', 'combined')),
  focus          text,
  question_ids   uuid[] not null,
  question_count smallint not null,
  status         text not null default 'in_progress'
                 check (status in ('in_progress', 'completed', 'abandoned')),
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index idx_papers_user on papers (user_id, started_at desc);

-- ============================================================
-- 5. ATTEMPTS
-- ============================================================
create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  paper_id         uuid references public.papers(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete cascade,
  total_questions  smallint not null,
  correct_count    smallint not null,
  score_pct        float not null,
  time_taken_secs  int,
  question_results jsonb not null,
  domain_results   jsonb not null,
  completed_at     timestamptz not null default now()
);

create index idx_attempts_user  on attempts (user_id, completed_at desc);
create index idx_attempts_paper on attempts (paper_id);

-- ============================================================
-- 6. DOMAIN ABILITY
-- ============================================================
create table public.domain_ability (
  user_id               uuid references public.profiles(id) on delete cascade,
  domain                text not null,
  ability               smallint not null default 500 check (ability between 200 and 800),
  questions_seen        int not null default 0,
  last_question_correct boolean,
  updated_at            timestamptz not null default now(),
  primary key (user_id, domain)
);

-- Seed domain_ability rows when profile is created
create or replace function public.seed_domain_ability()
returns trigger as $$
declare
  math_domains    text[] := array['Algebra', 'Advanced Math', 'PSDA', 'Geometry'];
  english_domains text[] := array['Craft & Structure', 'Information & Ideas', 'SEC', 'Expression'];
  all_domains     text[];
  d text;
begin
  all_domains := math_domains || english_domains;
  foreach d in array all_domains loop
    insert into public.domain_ability (user_id, domain, ability)
    values (new.id, d, 500)
    on conflict do nothing;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_ability
  after insert on public.profiles
  for each row execute function public.seed_domain_ability();

-- ============================================================
-- 7. GAP PROFILE
-- ============================================================
create table public.gap_profile (
  user_id              uuid references public.profiles(id) on delete cascade primary key,
  math_algebra         smallint,
  math_advanced        smallint,
  math_psda            smallint,
  math_geometry        smallint,
  english_craft        smallint,
  english_info         smallint,
  english_sec          smallint,
  english_expression   smallint,
  estimated_score_low  smallint,
  estimated_score_high smallint,
  top_gaps             jsonb,
  recommended_next     text,
  encouragement        text,
  papers_since_update  smallint not null default 0,
  updated_at           timestamptz not null default now()
);

-- Seed gap_profile row when profile is created
create or replace function public.seed_gap_profile()
returns trigger as $$
begin
  insert into public.gap_profile (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_gap
  after insert on public.profiles
  for each row execute function public.seed_gap_profile();

-- ============================================================
-- 8. RECALIBRATION FUNCTION
-- ============================================================
create or replace function public.recalibrate_questions()
returns void as $$
begin
  update public.questions
  set pass_rate = times_correct::float / nullif(times_seen, 0)
  where times_seen >= 50;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.questions      enable row level security;
alter table public.seen_questions enable row level security;
alter table public.papers         enable row level security;
alter table public.attempts       enable row level security;
alter table public.domain_ability enable row level security;
alter table public.gap_profile    enable row level security;

-- Profiles: own row only
create policy "profiles_own"
  on public.profiles for all
  using (auth.uid() = id);

-- Questions: public read, no client writes
create policy "questions_read"
  on public.questions for select
  using (true);

-- Seen questions: own rows only
create policy "seen_questions_own"
  on public.seen_questions for all
  using (auth.uid() = user_id);

-- Papers: own rows only
create policy "papers_own"
  on public.papers for all
  using (auth.uid() = user_id);

-- Attempts: own rows only
create policy "attempts_own"
  on public.attempts for all
  using (auth.uid() = user_id);

-- Domain ability: own rows only
create policy "domain_ability_own"
  on public.domain_ability for all
  using (auth.uid() = user_id);

-- Gap profile: own row only
create policy "gap_profile_own"
  on public.gap_profile for all
  using (auth.uid() = user_id);
