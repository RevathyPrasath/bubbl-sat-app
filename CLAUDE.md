# Bubbl — Adaptive SAT Prep App

Bubbl is a cross-platform adaptive SAT preparation app (iOS, Android, Web) backed by a serverless Next.js BFF and Supabase Postgres. It uses an Elo-style adaptive engine to personalise question selection per domain, with Stripe subscriptions, AdMob ads, and Claude-powered gap analysis.

---

## Monorepo Structure

```
/
├── apps/
│   ├── mobile/          Expo React Native app (iOS + Android)
│   └── api/             Next.js BFF (serverless API routes)
├── schema/
│   └── migrations/      Sequential numbered SQL files, applied manually in Supabase SQL editor
├── scripts/             Utility/seed scripts
├── docs/                Supporting documentation
├── SPECIFICATION.md     Product specification
└── CLAUDE.md            This file
```

---

## Build & Run

### Mobile (`apps/mobile/`)

```bash
npx expo start                 # Start Expo dev server (choose platform interactively)
npx expo start --ios           # Start and open on iOS simulator
npx expo start --android       # Start and open on Android emulator/device
npx expo start --web           # Start and open in browser
```

> **EAS (production builds — not npm scripts):**
> ```bash
> npx eas-cli@latest build      # Production build via EAS
> npx eas-cli@latest submit     # Submit build to App Store / Play Store
> ```

> **Important:** Always use `npx expo install <package>` — never `npm install` or `yarn add` — for any Expo-compatible package. This ensures the correct compatible version is selected for the installed Expo SDK.

### API (`apps/api/`)

```bash
npm run dev       # Next.js development server (hot reload)
npm run build     # Production build
npm run start     # Serve production build
```

---

## Lint & Type Check

### Mobile (`apps/mobile/`)

```bash
npx expo lint          # ESLint via Expo config
npx tsc --noEmit       # TypeScript type check (no emit)
```

### API (`apps/api/`)

No lint or test command is defined in `package.json`. Run `npx tsc --noEmit` manually if needed.

---

## Project Structure

### `apps/mobile/`

```
app/                    File-based routing via Expo Router — screens map directly to URL segments
app/(app)/              Authenticated route group (requires active session)
app/(auth)/             Unauthenticated route group (login, signup, onboarding)
components/             Shared React Native UI components
constants/Colors.ts     Theme colour tokens — always use these instead of hard-coded hex values
lib/api.ts              Centralised fetch wrapper — throws on !res.ok; all API calls go through here
lib/session-store.ts    Module-level singleton for auth session state
lib/active-session-store.ts  Module-level singleton for in-progress practice session state
lib/settings-store.ts   Module-level singleton for user settings/preferences
hooks/                  Custom React hooks
```

### `apps/api/`

```
app/api/                Next.js App Router API routes (file-based)
lib/auth.ts             requireAuth(req) — call at the top of every route handler; throws Response on 401
lib/supabase.ts         Three Supabase client factory functions (anon, user-scoped, service-role)
lib/adaptive.ts         Pure Elo-style adaptive engine — per-domain ability scores 200–800
```

---

## Architecture

Bubbl follows a three-tier client–BFF–database architecture: the Expo mobile app talks exclusively to Next.js API routes (the BFF), which in turn query Supabase Postgres with RLS enforced. The design is thin-server/fat-client — business logic lives in the mobile app and in `lib/adaptive.ts`; API routes are mostly thin orchestration. Supabase RLS policies are the authorisation boundary — never hand-roll permission checks inside route handlers. The adaptive engine (`apps/api/lib/adaptive.ts`) is a set of pure functions implementing Elo-style scoring with a K-factor; per-domain ability values range from 200 to 800 and drive question selection across domains (Algebra, Advanced Math, PSDA, Geometry, etc.). See `architecture.md` for the full reference.

---

## Key Conventions

- **Imports — mobile:** relative paths only (`../../lib/api`). No path aliases.
- **Imports — API:** `@/` alias maps to `./` (tsconfig). Use `@/lib/auth`, `@/lib/supabase`, etc.
- **File naming:** kebab-case for libraries and utilities (`session-store.ts`); PascalCase for React components (`QuestionCard.tsx`); lowercase for route screen files (`question.tsx`).
- **Styles:** `StyleSheet.create({...})` defined at the bottom of each screen file. Use colour tokens from `constants/Colors.ts`.
- **API route error handling:** `requireAuth(req)` throws a `Response` on 401. Every route handler must `catch (err) { return err as Response }` to propagate it correctly.
- **Client-side error handling:** `lib/api.ts` throws on `!res.ok`. Callers must handle or bubble errors.
- **SQL conventions:** snake_case column names; migrations are sequential numbered files (`001_initial.sql`, `002_...sql`) applied manually in the Supabase SQL editor — never auto-migrated.
- **Section banners in TS:** `// ─── Section Name ─────────────`. In SQL: `-- ======`.
- **Expo packages:** always install with `npx expo install`, not npm/yarn/pnpm.
- **Model ID:** Claude Haiku is hard-coded as `claude-haiku-4-5-20251001`. Do not change without testing.
- **Feature flag:** `FEATURE_SHOW_SEEN=true` re-enables serving already-seen questions. Defaults to false.
- **Domains are magic strings** spread across the codebase: `Algebra`, `Advanced Math`, `PSDA`, `Geometry`, etc. No enum centralises them yet.

---

## Environment Variables

### Mobile (`apps/mobile/`) — stored in `.env`; prefix `EXPO_PUBLIC_` exposes to client bundle

| Variable | Required | Controls |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project endpoint |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key for client auth |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe client-side payment initialisation |
| `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` | Yes (ads) | AdMob iOS banner ad unit ID |
| `EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID` | Yes (ads) | AdMob iOS interstitial ad unit ID |
| `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | Yes (ads) | AdMob Android banner ad unit ID |
| `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID` | Yes (ads) | AdMob Android interstitial ad unit ID |
| `EXPO_PUBLIC_API_URL` | Yes | Base URL of the Next.js BFF (e.g. `https://api.bubbl.app`) |

### API (`apps/api/`) — stored in `.env.local`; server-only, never exposed to client

| Variable | Required | Controls |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project endpoint |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Service-role key — bypasses RLS; keep secret |
| `SUPABASE_DB_PASSWORD` | Yes | Postgres password for direct DB connections |
| `SEED_SECRET` | Yes | Shared secret for seed/admin endpoints (`x-seed-secret` header) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for gap analysis feature |
| `STRIPE_SECRET_KEY` | Yes | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret for event verification |
| `STRIPE_MONTHLY_PRICE_ID` | Yes | Stripe price ID for the monthly subscription plan |
| `STRIPE_ANNUAL_PRICE_ID` | Yes | Stripe price ID for the annual subscription plan |
| `FEATURE_SHOW_SEEN` | No | Set to `true` to allow re-serving already-seen questions (default: `false`) |

---

## Database

**Migrations** are sequential numbered SQL files in `schema/migrations/` (e.g. `001_initial.sql`, `002_add_index.sql`). They are applied manually by pasting into the Supabase SQL editor — there is no automated migration runner. Always create a new numbered file; never edit an already-applied migration.

**Three Supabase client types** are defined in `apps/api/lib/supabase.ts`:

| Client | When to use |
|---|---|
| **Anon client** | Public, unauthenticated operations only. Subject to RLS anon policies. |
| **User-scoped client** | Pass when you have a valid user JWT (`Authorization: Bearer <token>`). Forwards the token so RLS `auth.uid()` policies apply correctly. Use this for all user-data reads and writes. |
| **Service-role client** | Admin/seed operations that must bypass RLS. Use only in internal tooling or webhook handlers. Never expose to request paths that accept arbitrary user input. |

Do not add a fourth client type without fully understanding the security model. RLS policies in `schema/migrations/001_initial.sql` are the system's authorisation boundary.

---

## External Services

| Service | SDK / Package | Used in | Purpose |
|---|---|---|---|
| Supabase | `@supabase/supabase-js` 2.118 | Mobile + API | Auth, Postgres database, RLS |
| Stripe | `stripe` 23 (API), `@stripe/stripe-react-native` (mobile) | Both | Monthly and annual subscriptions |
| Anthropic Claude | `@anthropic-ai/sdk` 1.3.0 | API only | Gap analysis via Claude Haiku (`claude-haiku-4-5-20251001`) |
| Google AdMob | `react-native-google-mobile-ads` | Mobile only | Banner and interstitial ads for free-tier users |
| Expo Notifications | `expo-notifications` | Mobile only | Push notifications |

---

## Critical Warnings

1. **RLS policies (`schema/migrations/001_initial.sql`) are the security boundary.** Any change to these policies can expose or lock out user data. Review changes with extreme care; never edit an applied migration file.

2. **Do not add a fourth Supabase client type** to `apps/api/lib/supabase.ts` without fully understanding the anon / user-scoped / service-role security model. Misusing the service-role client on a user-facing route bypasses RLS entirely.

3. **Do not modify `apps/api/lib/adaptive.ts` lightly.** This is the Elo-style adaptive engine. Any algorithmic change retroactively affects the interpretation of all existing user ability scores (200–800 range). Changes require deliberate design and migration planning.

4. **`apps/mobile/app/(app)/question.tsx` contains a fragile batch-submit flow.** It relies on `Promise.allSettled` to submit answers. Understand the full async pattern and partial-failure handling before making changes — breaking this silently drops user answers.

5. **Read `apps/api/AGENTS.md` before coding in the API** and `apps/mobile/AGENTS.md` before coding in the mobile app. Both files contain version-specific notes for Next.js 16 and Expo SDK 58 that override general framework assumptions.

---

## Living Document Policy

This file is maintained by the SDLC pipeline (`/init-repo`, `/spec-to-code`). It is updated on every significant commit that changes architecture, conventions, environment variables, or external service integrations. If you make a change that invalidates anything written here, update this file in the same commit. Do not let it drift.
