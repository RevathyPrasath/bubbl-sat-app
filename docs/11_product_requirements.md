# Bubbl — Product Requirements Document

**App:** Bubbl SAT Prep  
**Stack:** React Native + Expo (mobile/web) · Next.js API · Supabase  
**Last updated:** November 2026

---

## 1. Vision

Bubbl is an adaptive, affordable SAT prep app that makes high-quality test preparation accessible to every student. The core belief: personalized practice, honest feedback, and a sense of community produce better results than expensive tutoring or bloated course platforms.

---

## 2. Market Context

### Competitive Landscape

| App | Model | Price | Key Weakness |
|---|---|---|---|
| Khan Academy SAT | Free | $0 | No personalization, no competition |
| Kaplan SAT Prep | Subscription | $20–$30/mo | Expensive, not adaptive |
| Princeton Review | Course-based | $40–$50/mo | Too expensive for most students |
| CollegeBoard Bluebook | Official | Free | Practice tests only, no coaching |

### Bubbl's Position

- **Price:** $9.99/month (annual: $79.99 — saves 33%)  
- **Differentiator:** Adaptive difficulty that adjusts per domain in real time, plus a daily competitive contest that creates habit and community
- **Target user:** High school students in grades 10–12 preparing for the digital SAT, particularly those who cannot afford $500+ tutoring

---

## 3. User Plans

| Feature | Free | Premium ($9.99/mo) |
|---|---|---|
| Practice papers per week | 5 | Unlimited |
| Subjects per session | Math or English (not combined) | Math + English combined |
| Gap dashboard | Top 3 gaps only | All 9 domains + trend charts |
| Score history | Last 3 sessions | Full history |
| Step-by-step explanations | Yes | Yes |
| Daily contest | Yes | Yes |
| Forum | No | Yes |
| Ads (banner + interstitial) | Yes | No |
| PDF export | No | Yes |

---

## 4. Features — Implemented

### 4.1 Adaptive Practice

Students select a subject (Math, English, or combined for Premium) and receive 5–10 questions per session. The adaptive engine:

- Tracks per-domain ability scores (200–800 scale, Elo-like updates)
- Surfaces weaker domains more frequently
- Adjusts difficulty based on recent performance
- Prevents re-serving already-answered questions (spaced repetition)

**Session flow:**
1. `practice.tsx` → POST `/api/paper` → questions saved to `active-session-store`
2. `question.tsx` reads from store, displays questions one at a time
3. At session end: parallel POST to `/api/submit-answer` for each question, then fire-and-forget POST to `/api/complete-paper`
4. Navigate to `results.tsx`

### 4.2 Step-by-Step Explanations

Every question shows a full explanation after the session ends — whether the student answered correctly or not. Explanations are displayed as numbered steps, not a single paragraph.

**Parsing logic:** Explanations stored as plain text are split on:
1. Newline characters `\n` (preferred — write explanations with newlines)
2. Sentence boundaries `. ` (fallback for single-block explanations)

Applied consistently in both `results.tsx` (practice) and `contest.tsx` (daily challenge).

**Example format in DB:**
```
Identify the equation type. This is exponential growth.
Write the general form: P = P₀ × r^t where r is the growth factor.
The population doubles every 3 hours, so r = 2^(1/3) per hour.
Final equation: P = 500 × 2^(t/3). Check at t=3: P = 500 × 2 = 1000. ✓
```

### 4.3 Gap Analysis

After every 3 completed papers, the system recalculates the student's weakest domains and surfaces them prominently on the Progress tab. Domains tracked:

**Math:** Algebra · Advanced Math · Problem-Solving & Data Analysis · Geometry & Trig  
**English:** Information & Ideas · Craft & Structure · Expression of Ideas · Standard English Conventions

Each domain shows a trend arrow (↑ improving, ↓ declining) and an ability score delta from the last session.

### 4.4 Score History

Line chart of session scores over time on the Progress tab. Reads from the `attempts` table, which is written by `complete-paper` at session end. Requires admin client (user client blocked by RLS on `attempts`).

### 4.5 Daily Contest

**Concept:** Every day, all students compete on the same 10 questions simultaneously. Winner = most correct answers; ties broken by fastest time.

**Why it works:**
- Creates a reason to open the app every day (habit formation)
- Social competition drives motivation that solo drilling cannot
- Ranking by accuracy first (not speed) reinforces correct SAT strategy — a 10/10 in 20 minutes always beats 9/10 in 2 minutes

**Design decisions:**
- Contest opens at 10:00 UTC daily, closes at 23:59:59 UTC
- One attempt per student per day — no retries
- Timer is global and synchronized: counts seconds since `opens_at`, same value for every student, regardless of when they join
- Late joiners start mid-timer (time penalty built in naturally)
- When the contest closes, whatever the student has answered is auto-submitted — no abandonment
- No "Start" button — contest opens automatically for everyone at the same moment

**Auto-submit on close:** When `closes_at` arrives during an active session:
1. A closing countdown (⌛) in the quiz header turns red under 60 seconds
2. When it hits 0, the app automatically calls `handleSubmit()`
3. If the network fails, it retries once after 2 seconds

**Leaderboard:** Top 20 shown in results, with the student's own rank highlighted. Rank computed as: users ahead = those with higher `correct_count` OR same `correct_count` with lower `time_taken_secs`.

**Question selection:** 5 math + 5 English, medium difficulty range (difficulty_rating 350–650), shuffled.

**DB tables required:**
```sql
daily_contests (id, contest_date UNIQUE, question_ids uuid[], opens_at, closes_at)
contest_entries (id, contest_id, user_id UNIQUE per contest, answers jsonb,
                 correct_count, time_taken_secs, submitted_at)
```

**API endpoints:**
- `GET /api/contest` — returns today's contest, questions (no answers until submitted), leaderboard, user rank
- `POST /api/contest/submit` — scores answers, inserts entry, returns rank
- `GET /api/admin/test-contest` — creates today's contest without user auth (dev/admin use)

### 4.6 Notebook

Students can save questions to a personal notebook for later review. Accessible from the question screen during a session.

### 4.7 Profile & Settings

- Display name, SAT target date
- Current plan and weekly usage
- Score history chart
- Change password inline (no separate screen)
- XP bar (gamification layer)

---

## 5. Features — Planned

### 5.1 Student Forum (Premium)

**Concept:** A moderated discussion space where premium students can ask questions, share strategies, and explain concepts to each other.

**Why it's valuable:**
- The "protégé effect" — explaining a concept to someone else is one of the strongest ways to learn it
- Creates community and reduces churn
- A differentiated feature that no major SAT prep app offers

**Design decisions:**
- Premium-only to maintain signal-to-noise ratio
- Posts require approval before publishing (AI-assisted moderation)
- Topics are organized by SAT domain, not free-form

**Topic categories:**
- Algebra
- Advanced Math
- Data & Statistics
- Reading & Evidence
- Expression of Ideas
- Standard English Conventions
- Geometry & Trig
- General Strategy & Test Tips

**Approval flow:**
1. Student writes post → taps "Submit for review"
2. Claude agent checks: SAT-relevant? No copied/verbatim test questions? No harmful content?
3. Auto-approve if clean (< 5 seconds)
4. Auto-reject with reason if off-topic or policy violation
5. Flag for human review if borderline

**Critical rule — College Board IP:**  
Verbatim reproduction of official SAT questions is copyright infringement. The approval agent must reject posts that paste question text word-for-word. Students must discuss concepts and strategies, not the actual questions. This must be enforced both by the agent and stated explicitly in ToS.

**Launch sequence:**
- Phase 1: Domain-based discussion threads, no question linking
- Phase 2: Ability to link a discussion to a specific question the student just answered

**Build when:** 100+ paying users who will populate the forum. An empty forum is worse than no forum.

### 5.2 Diagnostic Test

A full-length diagnostic to establish a starting ability score for new users. Routes through the same `question.tsx` flow, but with a larger question set covering all domains equally.

### 5.3 Study Plan

Auto-generated weekly study schedule based on:
- Days until the student's SAT date (from profile)
- Current ability scores by domain
- Available practice time per week (from onboarding)

### 5.4 Streak & Achievements

Daily streak counter (consecutive days with at least one paper or contest entry). Achievements for milestones: first paper, 7-day streak, top 3 in contest, perfect 10/10, etc.

### 5.5 Stripe Subscription

Full subscription lifecycle:
- Monthly: $9.99/month
- Annual: $79.99/year (33% discount)
- 7-day free trial on monthly
- Apple Pay + Google Pay via Stripe React Native SDK
- Webhook handler for `customer.subscription.created/updated/deleted`

Currently wired in the UI (paywall screen exists) but Stripe credentials not yet configured.

---

## 6. Weekly Paper Limit

Free plan limit is **5 papers/week**. The count is computed dynamically — no cron job needed:

```ts
const daysToMonday = (now.getDay() + 6) % 7
const weekStart = new Date(now)
weekStart.setDate(now.getDate() - daysToMonday)
weekStart.setHours(0, 0, 0, 0)

const { count } = await supabase
  .from('papers')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', weekStart.toISOString())
  .neq('status', 'abandoned')
```

The week resets every Monday at 00:00 local time automatically.

---

## 7. Monetization

### Revenue Model

- **Primary:** Subscription ($9.99/month or $79.99/year)
- **Secondary:** AdMob ads for free users (banner + interstitial, shown between screens, never during active questions)

### Revenue Projections

**Month 6 (5,000 MAU, 5% conversion):**
- 250 premium × $9.99 = $2,497/month
- AdMob (4,750 free users): ~$760/month
- Net: ~$3,157/month

**Month 12 (20,000 MAU, 10% conversion):**
- 2,000 premium × $9.99 = $19,980/month
- AdMob (18,000 free users): ~$5,184/month
- Net: ~$25,164/month

### User Acquisition (Zero Budget)
1. Reddit — r/SAT, r/ApplyingToCollege
2. TikTok/Instagram — student improvement stories
3. School counselors — free premium codes for outreach
4. App Store optimization — "SAT prep free", "digital SAT practice", "SAT adaptive"
5. Release gap analysis findings as shareable content

---

## 8. Technical Constraints & Decisions

### Supabase Client Selection
| Use case | Client |
|---|---|
| User-owned data (papers, profiles) | `createSupabaseUserClient(token)` |
| Cross-user reads, questions, attempts | `createSupabaseAdminClient()` |

The `attempts` table is blocked by RLS for user clients. Score-history always uses the admin client.

### Session State
Practice questions are stored in `active-session-store` (module cache + sessionStorage backup), not in URL params. This survives web page navigation.

### Non-Tab Screen Routing
Hidden screens use `tabBarButton: () => null`. Using `href: null` breaks `router.push` on web — do not use it.

### Explanation Quality
Explanations should be written in newline-separated steps. Single-block paragraphs will be auto-split on sentence boundaries but step-by-step writing is better. The admin endpoint `PATCH /api/admin/update-question` can patch any question's explanation.

---

## 9. Screens Reference

| Screen | Route | Visible in nav |
|---|---|---|
| Home | `/(app)/home` | Yes — Home |
| Practice | `/(app)/practice` | Yes — Practice |
| Daily Contest | `/(app)/contest` | Yes — Daily 🏆 |
| Progress / Gap | `/(app)/gap` | Yes — Progress |
| Forum | `/(app)/forum` | Yes — Forum 💬 |
| Profile | `/(app)/profile` | Yes — Profile |
| Question (session) | `/(app)/question` | Hidden |
| Results | `/(app)/results` | Hidden |
| Notebook | `/(app)/notebook` | Hidden |
| Study Plan | `/(app)/study-plan` | Hidden |
| Achievements | `/(app)/achievements` | Hidden |
| Session History | `/(app)/history` | Hidden |
| Diagnostic | `/(app)/diagnostic` | Hidden |
| Paywall | `/(app)/paywall` | Hidden |

---

## 10. Open Questions / Decisions Pending

| Item | Status | Notes |
|---|---|---|
| Stripe wiring | Not started | Paywall UI exists; needs Stripe keys + webhook handler |
| Forum backend | Not started | Build when 100+ paying users |
| Diagnostic auto-assign | Partial | Screen exists; not auto-triggered on new user signup |
| Contest question pool | Needs growth | Currently 39 questions; contest needs variety across days |
| Push notifications | Not started | Daily contest reminder ("Today's challenge is live!") |
| Contest open time | 10:00 UTC | May need to adjust based on student timezone distribution |
| Anonymous sign-in | Disabled | Supabase config; re-enable if guest/demo mode is needed |
