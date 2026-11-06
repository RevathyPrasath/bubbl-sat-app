# Architecture — Bubbl

Last updated: 2026-11-06
Version: 1.0

---

## System Overview

Bubbl is a consumer mobile SAT prep application delivered across iOS, Android, and web from a single Expo/React Native codebase, backed by a serverless BFF (Backend-for-Frontend) and an AI-augmented analytics layer. The system is designed around a **thin-server/fat-client** split: the clients own all UX state (timers, flagging, cross-out, batch answer submission) while the server owns adaptive-engine math, authorization, and persistence.

The product's defining loop is an **adaptive practice session**: the backend assembles a 10-question paper tuned to the user's current ability per domain, the client runs the session locally, and on completion a parallel burst of API calls updates the user's Elo-style rating and seen-question history. A separate on-demand Claude Haiku pass turns the resulting ability vector into a narrative gap analysis.

**Architectural pattern:** Three-tier client–BFF–database with:
- Multi-tenant Postgres (Supabase) using **Row-Level Security as the authorization boundary**
- File-based serverless API routes (Next.js App Router) deployed on Vercel
- A **pure, framework-free adaptive engine** that is the system's intellectual core
- AI calls (Anthropic Claude Haiku) used for narrative generation and content moderation, never for authoritative scoring

**Deployment surface:**
- Mobile apps: Expo EAS build → App Store / Play Store
- Web client: Expo web build → Vercel
- API: Next.js on Vercel (serverless)
- Database: Supabase (managed Postgres with Auth, Storage, Realtime unused except Auth)

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Mobile runtime | Expo SDK | 58.0.21 | Cross-platform native shell |
| Mobile UI | React Native | 0.88.1 | iOS / Android views |
| UI framework | React | 19.3.0 | Component model (shared mobile + api) |
| Mobile routing | expo-router | 58.0.28 | File-based navigation |
| Mobile language | TypeScript | 6.0.3 | Type safety |
| API runtime | Next.js | 16.4.3 | Serverless API routes (App Router) |
| API language | TypeScript | 5.x | Type safety |
| Server state | @tanstack/react-query | 5.105.0 | Caching / retries on client |
| Auth + DB client | @supabase/supabase-js | 2.118.0 | Postgres + Auth SDK |
| AI SDK | @anthropic-ai/sdk | 1.3.0 | Claude Haiku calls |
| Payments (server) | stripe | 23.0.1 | Checkout + webhooks |
| Payments (mobile) | @stripe/stripe-react-native | 0.84.0 | Native payment sheet |
| Ads | Google AdMob (Expo) | — | Banner + interstitial for free tier |
| Database | Postgres (Supabase) | 15+ | Primary datastore |
| Cron | pg_cron (Supabase) | — | Weekly reset, daily recalibration |
| Calculator | Desmos (iframe) | — | Embedded graphing calc |

---

## System Architecture

```
                   ┌─────────────────────────────────────────┐
                   │             CLIENT TIER                 │
                   │  ┌────────────┐      ┌───────────────┐  │
                   │  │ iOS / And. │      │   Web (Expo)  │  │
                   │  │   Expo RN  │      │     Next SSG  │  │
                   │  └─────┬──────┘      └───────┬───────┘  │
                   │        │   expo-router        │         │
                   │        └──────────┬───────────┘         │
                   │                   │                     │
                   │   ┌───────────────┴────────────────┐    │
                   │   │  lib/api.ts (Bearer injector)  │    │
                   │   │  context/AuthContext           │    │
                   │   │  lib/session-store (singletons)│    │
                   │   └───────────────┬────────────────┘    │
                   └───────────────────┼─────────────────────┘
                                       │ HTTPS + Bearer JWT
                   ┌───────────────────┼─────────────────────┐
                   │                   ▼    BFF TIER         │
                   │   ┌──────────────────────────────┐      │
                   │   │  Next.js API (Vercel)        │      │
                   │   │  apps/api/app/api/**/route.ts│      │
                   │   │                              │      │
                   │   │  ┌────────────────────────┐  │      │
                   │   │  │ lib/auth.ts            │  │      │
                   │   │  │ requireAuth(req)       │  │      │
                   │   │  └──────────┬─────────────┘  │      │
                   │   │             │                │      │
                   │   │  ┌──────────┴─────────────┐  │      │
                   │   │  │ lib/supabase.ts        │  │      │
                   │   │  │ anon / user / service  │  │      │
                   │   │  └──────────┬─────────────┘  │      │
                   │   │             │                │      │
                   │   │  ┌──────────┴─────────────┐  │      │
                   │   │  │ lib/adaptive.ts        │  │      │
                   │   │  │ (pure Elo + sampler)   │  │      │
                   │   │  └────────────────────────┘  │      │
                   │   │  ┌────────────────────────┐  │      │
                   │   │  │ lib/forum-review.ts    │  │      │
                   │   │  └────────────────────────┘  │      │
                   │   └───┬─────────┬─────────┬──────┘      │
                   └───────┼─────────┼─────────┼─────────────┘
                           │         │         │
          ┌────────────────▼──┐  ┌───▼────┐  ┌─▼──────────────┐
          │ Supabase Postgres │  │Anthrop.│  │ Stripe + AdMob │
          │ + Auth + RLS      │  │ Haiku  │  │ + Expo Push    │
          │ + pg_cron         │  │        │  │                │
          └───────────────────┘  └────────┘  └────────────────┘
```

**Call pattern across the tiers:**

1. The client fetches a Supabase session (JWT) at launch via `AuthContext`.
2. `lib/api.ts` attaches `Authorization: Bearer <access_token>` to every request.
3. The BFF's `requireAuth` verifies the JWT by calling `supabase.auth.getUser(token)` using an **anon-key client** — no shared signing secret on the server. On failure it throws a `Response(401)` which the route's `catch` block returns verbatim.
4. For each request, the route instantiates a **user-scoped Supabase client** with the Bearer token forwarded, so every SQL statement runs under the end user's identity — RLS enforces per-row isolation.
5. Cross-user reads (admin ops, moderator paths, published-review picks) use the **service-role client** that bypasses RLS and is never exposed to clients.
6. Claude Haiku is invoked server-side only (gap analysis and forum moderation). Stripe webhooks are authenticated by signature.

---

## Component Reference

### Client — Authentication context

- **Location:** `apps/mobile/context/AuthContext.tsx`
- **Responsibility:** Single source of truth for session state; wraps `supabase.auth` with React context.
- **Interfaces:** `useAuth()` → `{ session, user, signIn, signUp, signOut, signInWithGoogle, signInWithFacebook }`.
- **Dependencies:** `@supabase/supabase-js`, Expo auth session.
- **Key files:** `apps/mobile/context/AuthContext.tsx`, `apps/mobile/lib/supabase.ts`.
- **Notes:** Subscribes to `onAuthStateChange`; token refresh is handled by Supabase SDK transparently.

### Client — API HTTP wrapper

- **Location:** `apps/mobile/lib/api.ts`
- **Responsibility:** Centralised fetch wrapper. Reads current session from Supabase, auto-attaches `Authorization: Bearer <token>`, throws on `!res.ok` with parsed error body.
- **Interfaces:** `api.get(path)`, `api.post(path, body)`, etc.
- **Dependencies:** `supabase.auth.getSession()` (never trusts a stale cached token).
- **Key files:** `apps/mobile/lib/api.ts`.

### Client — Module-level state singletons

- **Location:** `apps/mobile/lib/session-store.ts`, `apps/mobile/lib/active-session-store.ts`, `apps/mobile/lib/settings-store.ts`
- **Responsibility:** Share state across screens without prop-drilling or a store library. Holds in-flight paper, last results, user settings.
- **Interfaces:** Named getters/setters per store (e.g. `getActiveSession`, `setResults`).
- **Notes:** Deliberate: lighter than Zustand/Redux, but **not persisted** — a crashed app loses results not yet written to `attempts`.

### Client — Practice screen (fat client)

- **Location:** `apps/mobile/app/(app)/question.tsx`
- **Responsibility:** Runs the entire in-session UX locally: countdown timer, question flagging, answer cross-out, Desmos calculator iframe (web) / fallback (native), review-before-submit sheet, batch submission.
- **Interfaces:** Called from `practice.tsx` with a `paperId`. Submits via `Promise.allSettled` over `/api/submit-answer` calls.
- **Dependencies:** `lib/api.ts`, `lib/session-store.ts`.
- **Key files:** `apps/mobile/app/(app)/question.tsx`, `apps/mobile/app/(app)/practice.tsx`, `apps/mobile/app/(app)/results.tsx`.

### Client — Dashboard

- **Location:** `apps/mobile/app/(app)/home.tsx`
- **Responsibility:** Landing surface post-login. Shows streak, estimated SAT score (from `GET /api/gap-analysis`), resume banner for in-flight papers, "Today's Focus" recommendation.
- **Dependencies:** React Query for cached dashboard reads.
- **Key files:** `apps/mobile/app/(app)/home.tsx`.

### Client — Auth screens

- **Location:** `apps/mobile/app/(auth)/`
- **Screens:** `welcome`, `signin`, `signup`, `forgot-password`, `reset-password` (five total).
- **Responsibility:** Email/password + Google + Facebook OAuth entry points. All routed through `AuthContext`.

### Server — Auth guard

- **Location:** `apps/api/lib/auth.ts`
- **Responsibility:** `requireAuth(req)` — extracts the Bearer token from the `Authorization` header, verifies it via `supabase.auth.getUser(token)` using the anon-key client, returns `{ id: string, email: string }` or throws a `Response(401)`.
- **Interfaces:** Called at the top of every protected route: `const user = await requireAuth(req)` returns `{ id: string, email: string }`.
- **Dependencies:** `lib/supabase.ts` (anon client).
- **Key files:** `apps/api/lib/auth.ts`.
- **Convention:** Route handlers wrap the body in `try { … } catch (err) { return err as Response }` so a thrown `Response` from `requireAuth` becomes the response verbatim.

### Server — Supabase client factory

- **Location:** `apps/api/lib/supabase.ts`
- **Responsibility:** Three client factories with different trust postures:
  - **Anon client** — public, used by `requireAuth` to verify tokens.
  - **User-scoped client** — anon key + bearer forwarded in `Authorization` header; every SQL runs under the end user's `auth.uid()`; RLS is the authorization boundary. **This is the default for route handlers.**
  - **Service-role client** — bypasses RLS entirely. Used only for cross-user reads (published forum review picks, admin batch jobs). Never exposed to clients.
- **Key files:** `apps/api/lib/supabase.ts`.

### Server — Adaptive engine (pure)

- **Location:** `apps/api/lib/adaptive.ts`
- **Responsibility:** Framework-free math. No side effects, no I/O.
- **Interfaces:**
  - `updateAbility(oldAbility, difficultyRating, isCorrect)` — Elo K-factor update.
  - `abilityToTargetRating(ability)` — maps an ability value to the ideal next difficulty.
  - `getRatingBand(ability)` — ±150 buffer around the target.
  - `autoWeightByAbility(domainAbilities)` — distribution of paper slots across weak domains.
  - `getDomainWeights(subject, focus?)` — explicit focus override (e.g. `focus: 'psda'`).
  - `sampleByDifficulty(questions)` — enforces 25 / 45 / 25 / 5 mix for Easy / Medium / Hard / Hardest.
- **Dependencies:** none.
- **Key files:** `apps/api/lib/adaptive.ts`.
- **Notes:** This module is the system's intellectual core and the highest-leverage test target (currently untested — see Technical Debt #1).

### Server — Forum content moderation

- **Location:** `apps/api/lib/forum-review.ts`
- **Responsibility:** Calls Claude Haiku to review user-generated forum content before publication.
- **Dependencies:** `@anthropic-ai/sdk`.
- **Key files:** `apps/api/lib/forum-review.ts`.

### Server — Paper assembly route

- **Location:** `apps/api/app/api/paper/route.ts`
- **Responsibility:** The system's most complex route. On `POST`:
  1. `requireAuth`.
  2. Free-tier gate: 5 papers per week (see Tech Debt #6 — inconsistency with schema/docs).
  3. Load user's per-domain ability map from `domain_ability`.
  4. Load user's seen-set from `seen_questions` (for dedup).
  5. Spaced repetition: reserve up to 3 slots for questions the user got wrong > 24 h ago.
  6. Published-review picks via admin client.
  7. Compute per-domain weights via `getDomainWeights` / `autoWeightByAbility`.
  8. For each domain, query the question bank in the ability's ±150 band; widen the band on fallback if under-populated.
  9. Apply `sampleByDifficulty` (25/45/25/5 mix).
  10. Shuffle, persist to `papers.question_ids`, strip correct answers from the response.
- **Dependencies:** `lib/auth`, `lib/supabase` (both user and service-role), `lib/adaptive`.
- **Key files:** `apps/api/app/api/paper/route.ts`.

### Server — Answer submission route

- **Location:** `apps/api/app/api/submit-answer/route.ts`
- **Responsibility:** Mark one answer:
  1. Verify paper ownership.
  2. Reject duplicate submissions for the same question in the same paper.
  3. Call `updateAbility(oldAbility, questionDifficulty, isCorrect)`.
  4. Upsert `domain_ability`.
  5. Upsert `seen_questions` (with `last_seen_at`, `last_result`).
  6. Increment `questions.times_seen` and `times_correct` (non-atomic — see Tech Debt #4).
- **Key files:** `apps/api/app/api/submit-answer/route.ts`.

### Server — Complete-paper route

- **Location:** `apps/api/app/api/complete-paper/route.ts`
- **Responsibility:** Finalise a session — write an `attempts` row with `question_results` (per-question outcomes) and `domain_results` (aggregates) as JSONB.
- **Called:** best-effort from the client (no `await` on the fire) — if it fails, per-question answers already landed via `submit-answer` but the session summary is missing.
- **Key files:** `apps/api/app/api/complete-paper/route.ts`.

### Server — Gap analysis route

- **Location:** `apps/api/app/api/gap-analysis/route.ts`
- **Responsibility:**
  - `GET`: **fast, DB-only.** Reads `domain_ability`, converts the ability vector to an estimated SAT score, returns immediately. Powers the dashboard score chip.
  - `POST`: **slow, AI-powered.** Sends the ability vector + recent attempts to Claude Haiku, parses the JSON response (strips markdown code fences), upserts `gap_profile`.
- **Dependencies:** `@anthropic-ai/sdk`, `lib/supabase` (user client).
- **Key files:** `apps/api/app/api/gap-analysis/route.ts`.

### Server — Billing routes

- **Location:** `apps/api/app/api/create-checkout/route.ts`, `apps/api/app/api/webhook/stripe/route.ts`, `apps/api/app/api/subscription/route.ts`
- **Responsibility:** Stripe Checkout session creation, webhook-driven plan elevation on `profiles.plan`, and subscription status queries.
- **Auth:** Webhook authenticated by Stripe signature header, not Bearer JWT.

### Server — Admin routes

- **Location:** `apps/api/app/api/admin/**/route.ts` (seeding, bulk inserts, recalibration triggers)
- **Auth:** Gated by `x-seed-secret` header matching an env var — not user JWT. Service-role client used throughout.

---

## Data Model

### Tables (Supabase Postgres)

| Table | Scope | Primary purpose | Key columns |
|---|---|---|---|
| `profiles` | One per user | Public extension of `auth.users`; plan, Stripe IDs, weekly counters | `id` (= auth.uid), `plan`, `stripe_customer_id`, `stripe_subscription_id`, `papers_this_week`, `week_start_at` |
| `questions` | Global, read-mostly | SAT question bank | `id`, `subject`, `domain`, `skill`, `difficulty` ∈ {300, 500, 650, 800}, `times_seen`, `times_correct`, payload JSONB |
| `seen_questions` | Per user × question | Dedup + spaced repetition | `(user_id, question_id)`, `last_seen_at`, `last_result` |
| `papers` | Per session | Assembled 10-question set | `id`, `user_id`, `subject`, `question_ids` uuid[], `focus`, `created_at` |
| `attempts` | Per completed session | Final results | `id`, `user_id`, `paper_id`, `question_results` JSONB, `domain_results` JSONB, `score_estimate` |
| `domain_ability` | Per user × domain | Live Elo state | `(user_id, domain)`, `ability` ∈ [200, 800], `updated_at` |
| `gap_profile` | One per user | Claude narrative + score range | `user_id`, `narrative`, `estimated_score_low`, `estimated_score_high`, `updated_at` |

### Triggers

- `handle_new_user` (on `auth.users` insert) → creates `profiles` row.
- `seed_domain_ability` → seeds one `domain_ability` row per subject domain at 500 (mid-band).
- `seed_gap_profile` → seeds an empty `gap_profile`.

Chain runs on every signup so all per-user structures exist before the first API call.

### Scheduled jobs (pg_cron)

| Job | Schedule | Purpose |
|---|---|---|
| `reset_weekly_papers` | Mon 00:00 UTC | Zero `profiles.papers_this_week`, reset `week_start_at` |
| `recalibrate_questions` | Daily 02:00 UTC | Adjust `difficulty` based on `times_seen` / `times_correct` drift |

### Migrations

- Location: `schema/migrations/` — numbered 001–005.
- Applied manually in the Supabase SQL editor (no automated migration runner — see Tech Debt).

### Entity relationships

```
┌──────────────┐
│  auth.users  │ (Supabase-managed)
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐     1:N      ┌──────────────┐
│   profiles   │──────────────│    papers    │
└──────┬───────┘              └──────┬───────┘
       │                             │ 1:1
       │ 1:N                         ▼
       │                      ┌──────────────┐
       ├─────────────────────▶│   attempts   │
       │                      └──────────────┘
       │ 1:N
       ▼
┌──────────────────┐
│  domain_ability  │
└──────────────────┘
       │
       │ (narrative for)
       ▼
┌──────────────┐
│ gap_profile  │ (1:1 with user)
└──────────────┘

┌──────────────┐     N:M via seen_questions     ┌──────────────┐
│   profiles   │────────────────────────────────│  questions   │
└──────────────┘                                └──────────────┘
                                                       ▲
                                                       │ referenced by
                                                       │ papers.question_ids[]
                                                       │ attempts.question_results
```

---

## Data Flow — Core Practice Loop

End-to-end walkthrough from the user tapping a subject card to the dashboard showing an updated score.

**1. Launch session**
- User taps the Math card on `home.tsx`.
- `router.push('/(app)/practice')`.

**2. Request a paper**
- `practice.tsx` → `POST /api/paper` with `{ subject: 'math', focus?: 'psda' | ... }`.
- Server: `requireAuth` → free-tier gate → ability load → seen-set load → spaced-repetition slot allocation → review picks → per-domain band queries (with fallback widening) → `sampleByDifficulty` mix → shuffle → persist `papers` row → **strip correct answers** from the response.
- Response: 10 questions, no answer keys.

**3. Work the session (fully local)**
- `question.tsx` runs the timer, tracks flags, cross-outs, and per-question selected answers in local state.
- Desmos calculator loaded via iframe on web, fallback on native.
- **No per-question API calls** — the server has no live visibility into the session.

**4. Final submit (batch)**
- `Promise.allSettled` fires one `POST /api/submit-answer` per question in parallel.
- Each call: verify ownership → check duplicate → `updateAbility(oldAbility, difficultyRating, isCorrect)` → upsert `domain_ability` → upsert `seen_questions` → increment `questions.times_seen` / `times_correct`.
- **Failure mode:** `allSettled` collects errors but the UI does not surface them — a partially-written attempt is possible (see Tech Debt #3).

**5. Complete the paper**
- Client fires `POST /api/complete-paper` **without `await`** (best-effort).
- Server writes `attempts` with `question_results` + `domain_results` JSONB.

**6. Show results**
- `router.replace('/(app)/results')`.
- Results screen reads from `lib/session-store.ts` (in-memory) — no network call.

**7. Dashboard refresh (next time home mounts)**
- `GET /api/gap-analysis`: reads `domain_ability` → converts to score estimate → returns instantly.
- Dashboard shows updated score chip and "Today's Focus" recommendation.

**8. Narrative generation (on explicit user action)**
- `POST /api/gap-analysis`: server sends ability vector to Claude Haiku → parses JSON (strips markdown fences) → upserts `gap_profile`.
- User sees narrative on the Insights tab.

---

## External Integrations

| Service | Purpose | Auth method | Where called | Failure mode |
|---|---|---|---|---|
| Supabase Auth | User identity; email/password + Google + Facebook OAuth | JWT (verified per request via anon-key `auth.getUser(token)`) | `apps/api/lib/auth.ts` | 401 thrown as `Response` |
| Supabase Postgres | Primary datastore; RLS as authorization boundary | Service role (admin) or Bearer-forwarded (user) | `apps/api/lib/supabase.ts` | DB errors bubble as 500; RLS denials surface as empty result sets |
| Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) | Gap analysis narrative (POST) + forum moderation | API key (server-only env var) | `apps/api/app/api/gap-analysis/route.ts`, `apps/api/lib/forum-review.ts` | JSON parse via `JSON.parse` after stripping markdown fences; **no schema validation** (see Tech Debt #7) |
| Stripe | Subscription checkout + plan elevation | API key (server); signed webhook | `apps/api/app/api/create-checkout/route.ts`, `apps/api/app/api/webhook/stripe/route.ts` | Webhook idempotency handled via Stripe event IDs; failures retried by Stripe |
| Google AdMob | Banner + interstitial for free-tier users | Platform-specific app IDs from `EXPO_PUBLIC_ADMOB_*` env | `apps/mobile/components/ads/*` | Soft-fail: ad slot empties, no user impact |
| Expo Push Notifications | Server-triggered reminders | Expo push token registered via `POST /api/push/register` | `apps/api/app/api/push/register/route.ts` | Token stored on `profiles`; push sends are fire-and-forget |
| Desmos Graphing Calculator | In-session calculator | Public iframe embed (web) / fallback (native) | `apps/mobile/app/(app)/question.tsx` | Iframe load failure: calculator unavailable but session proceeds |

---

## Cross-Cutting Concerns

### Authentication & Authorization

- **Authentication:** Bearer JWT issued by Supabase Auth, verified server-side by calling `supabase.auth.getUser(token)` with the anon-key client. There is no shared signing secret on the API side — the verification is a round-trip to Supabase.
- **Authorization:** **Postgres Row-Level Security.** Every production route uses a user-scoped Supabase client with the Bearer token forwarded; RLS policies decide what rows the user can read/write. The service-role client bypasses RLS and is restricted to cross-user reads and admin paths.
- **Admin auth:** `x-seed-secret` header matching an env var — orthogonal to user JWT.

### Error handling

- Convention: `requireAuth` throws a raw `Response` object on failure.
- Route handlers wrap the body: `try { … } catch (err) { return err as Response }`.
- Downside: non-`Response` throws (e.g. a thrown `Error` from the adaptive engine) would surface as `undefined` — relies on the engine being non-throwing.

### Styling

- `StyleSheet.create` at the bottom of each screen file (React Native convention).
- Shared theme tokens live in `apps/mobile/constants/Colors.ts`.

### CORS

- Preflight (`OPTIONS`) responses include CORS headers.
- **Non-preflight responses do not** — see Tech Debt #10. Works today because mobile clients are not browser-origin, but web client depends on same-origin.

### State management

- Server state: `@tanstack/react-query`.
- Session/UI state: React Context (`AuthContext`) + module-level singletons (`lib/session-store.ts`, `lib/active-session-store.ts`, `lib/settings-store.ts`). No Redux/Zustand.

### Section banners

- TypeScript: `// ─── Section name ─────────────`
- SQL: `-- ======================`

### File naming

- Libraries: `kebab-case.ts`
- React components: `PascalCase.tsx`
- Route screens: lowercase (matches URL segment)

### Imports

- Mobile: relative imports throughout.
- API: `@/` path alias configured in `tsconfig.json`.

### SQL conventions

- `snake_case` columns and tables.
- Sequential numbered migrations: `001_*.sql`, `002_*.sql`, …
- Manual application via Supabase SQL editor.

---

## Deployment

| Surface | Host | Pipeline |
|---|---|---|
| iOS / Android apps | Expo EAS → App Store / Play Store | Manual EAS build + submit |
| Web client | Vercel (static export of Expo web) | Git push to main |
| API | Vercel (Next.js serverless) | Git push to main |
| Database | Supabase (managed) | Manual SQL migrations in `schema/migrations/` |
| Cron | `pg_cron` on Supabase | Defined in migrations |

**Environments:** production + preview (Vercel preview deploys per PR; mobile uses a single Expo project with EAS channels).

**Secrets:**
- API: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SEED_SECRET`.
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ADMOB_*`.

---

## Known Technical Debt

Numbered by priority for the next hardening pass.

1. **No test suite anywhere.** Highest leverage target: `apps/api/lib/adaptive.ts` — pure functions, deterministic, the system's intellectual core. A broken Elo update or `sampleByDifficulty` mix is silent and compounding. **Owner:** test-agent.

2. **Grid-in answers compared with the MCQ comparator.** Student-produced-response ("grid-in") answers are checked by the same string-equality path as multiple choice — no normalisation for `0.5` vs `1/2` vs `.50`. Users with mathematically correct non-canonical forms are marked wrong. Location: `apps/api/app/api/submit-answer/route.ts`.

3. **Batch submit swallows failures silently.** `Promise.allSettled` in `apps/mobile/app/(app)/question.tsx` collects failures but the UI does not surface them. A transient network blip during the final submit burst produces a partially-persisted attempt with no user feedback and no server-side reconciliation.

4. **Non-atomic `times_seen` / `times_correct` increments.** `submit-answer` does a read-modify-write on `questions.times_seen` and `times_correct`. Two concurrent submits of the same question lose an increment. Recalibration (daily cron) is biased downward over time. Fix: use `UPDATE questions SET times_seen = times_seen + 1 …` or an RPC. Location: `apps/api/app/api/submit-answer/route.ts`.

5. **`NOT IN (huge_uuid_list)` in paper assembly.** Dedup against `seen_questions` in `apps/api/app/api/paper/route.ts` is implemented by passing the seen-set as a literal `NOT IN` list. This degrades linearly with session count and will visibly slow paper assembly for power users. Fix: `NOT EXISTS` with a left-join or a dedicated SQL function.

6. **Free-tier limit inconsistency.** Code in `apps/api/app/api/paper/route.ts` enforces 5 papers / week. Schema has a counter column suggesting the limit lives there. Docs (`SPECIFICATION.md` / README) say 2 / week. Pick one and align all three.

7. **Claude JSON parsing is fragile.** `gap-analysis` POST uses `JSON.parse` after string-stripping markdown code fences. No schema validation (Zod/Valibot). A malformed Claude response 500s the route. Location: `apps/api/app/api/gap-analysis/route.ts`.

8. **Hard-coded Claude model ID.** `claude-haiku-4-5-20251001` appears as a literal string. Pin via env var so model upgrades are a config change, not a code change.

9. **No shared types package.** The `Question` type (and others) is duplicated in `apps/mobile/` and `apps/api/`. Drift risk: an API-side field addition is silent on the mobile side. Fix: `packages/shared/types.ts` or a tsconfig path alias across the monorepo.

10. **CORS headers only on preflight.** Preflight `OPTIONS` responses have CORS headers; actual response bodies do not. Web-client works today only because requests are same-origin on Vercel. Breaks the moment the API is split or called from a different origin.

---

## Architecture Decision Log

| Date | Decision | Rationale | Alternatives | Owner |
|---|---|---|---|---|
|  |  |  |  |  |

---

## Change History

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-11-06 | 1.0 | Initial architecture document | /init-repo |
