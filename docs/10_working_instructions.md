# Working Instructions — Bubbl SAT App

Practical reference for day-to-day development. Keep this updated as decisions are made.

---

## Running the App Locally

### Start both servers

```bash
# Terminal 1 — API (Next.js)
cd apps/api
PORT=3002 npm run dev

# Terminal 2 — Mobile (Expo web)
cd apps/mobile
npx expo start --web --port 8081
```

App is at **http://localhost:8081** · API is at **http://localhost:3002**

> Port 3002 is required for the API because port 3000 may be occupied by other local projects.

### Environment file location
```
apps/api/.env.local
```
Key variables:
| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://hdvyfeolbxgepneavuiv.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_...` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` (service role JWT) |
| `SEED_SECRET` | `dev-seed-secret-2024` |
| `FEATURE_SHOW_SEEN` | `true` (dev only — allows re-answering seen questions) |

---

## Key Architecture Decisions

### Questions flow through `active-session-store`
Practice questions are **not** passed via URL params (too large). Instead:
1. `practice.tsx` calls `saveActiveSession({ paperId, questionsJson, currentIndex, totalQuestions })`
2. `question.tsx` calls `getActiveSession()` to load them
3. Store uses a module-level cache + `sessionStorage` backup so questions survive web page navigation/refresh

**Do not** pass questions via router params — they will be lost on web navigation.

### Non-tab screens use `tabBarButton: () => null`
Hidden screens (question, results, notebook, etc.) must use:
```tsx
options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }}
```
**Not** `href: null` — that makes the screen unroutable via `router.push` on web.

### Supabase client selection
| Use case | Client |
|---|---|
| User-owned data (papers, profiles, domain_ability) | `createSupabaseUserClient(token)` |
| Cross-user reads, questions table, attempts table | `createSupabaseAdminClient()` |

The `attempts` table has RLS that blocks user clients — always use admin client for score-history queries.

### Weekly paper limit is computed live
Free plan: 5 papers/week. The count is computed by querying the `papers` table:
```ts
const { count } = await supabase
  .from('papers')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', weekStart.toISOString())
  .neq('status', 'abandoned')
```
No cron job needed — the week resets automatically at Monday 00:00 local time.

### Session completion flow
`question.tsx` → `submit-answer` (per question, in parallel) → `complete-paper` (fire-and-forget) → navigate to `results.tsx`

`complete-paper` writes the `attempts` row (required for score-history chart) and marks the paper `completed`.

---

## Admin Endpoints

All require header: `x-seed-secret: dev-seed-secret-2024`

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/update-question` | `PATCH` | Update a single question by `id` |
| `/api/admin/patch-explanations` | `POST` | Bulk-patch explanations for questions missing them |
| `/api/seed-questions` | `POST` | Insert the base 35-question seed set |

### Patch a single question
```bash
curl -X PATCH http://localhost:3002/api/admin/update-question \
  -H "x-seed-secret: dev-seed-secret-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<question-uuid>",
    "explanation": "Step 1: ...\nStep 2: ...",
    "trap_choice": "A",
    "strategy": "One-line tip for this question type."
  }'
```

### Query questions directly (Supabase REST)
```bash
curl "https://hdvyfeolbxgepneavuiv.supabase.co/rest/v1/questions?select=id,stem,explanation&limit=5" \
  -H "apikey: <SUPABASE_SERVICE_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_KEY>"
```

---

## Explanation Format

Explanations are stored as plain strings in the `explanation` column. The results screen parses them:
1. **Newline-separated** (`\n`) → numbered step list
2. **Sentence-separated** (`. `) → numbered step list
3. **Single block** → shown as one paragraph

Good explanation format:
```
Step 1: Identify the two legs. a = 9, b = 12.
Step 2: Apply Pythagorean theorem: a² + b² = c².
Step 3: 81 + 144 = 225. So c = √225 = 15.
```

---

## Database Tables (key ones)

| Table | Purpose |
|---|---|
| `questions` | Question bank (39 questions as of Nov 2026) |
| `papers` | Practice session records (`in_progress` → `completed`) |
| `seen_questions` | Per-user question history (upserted, not inserted) |
| `attempts` | Completed session summaries — powers score-history chart |
| `domain_ability` | Per-user per-domain ability score (Elo-like, 200–800) |
| `profiles` | User plan, SAT target date, name |
| `gap_profile` | Tracks papers since last gap analysis update |

---

## Common Development Tasks

### Add new questions to the DB
1. Write explanation in newline-separated steps format
2. PATCH via `/api/admin/update-question` for existing questions
3. For new questions: add to `seed-questions/route.ts` and re-seed, or insert via Supabase dashboard

### Test a full practice session
1. Open http://localhost:8081
2. Sign in (use real credentials — anonymous sign-in is disabled)
3. Home → Practice → select subject → questions appear
4. Answer all questions → submit → results screen shows explanations
5. Check Progress tab — score-history chart should update after completing a session

### Debug score-history returning no data
Score history reads from `attempts` table, which is only written by `complete-paper`.
Check: did the session complete (not just navigate away)? The `papers` table should have a `completed` row for the session.

### Debug "questions not loading" on web
Check `sessionStorage` in browser devtools for key `bubbl_active_session`. If missing, the `active-session-store` cache was lost. This usually means `practice.tsx` didn't call `saveActiveSession` before navigating.

---

## Supabase Limitations (dev environment)

- `sb_secret_` key format does NOT work as a JWT Bearer token for PostgREST REST calls — use the service role JWT (`eyJhbGci...`) directly for admin REST calls
- Anonymous sign-in is currently disabled — users must have a real account
- Direct postgres connection (`db.*.supabase.co`) does not resolve from this machine

---

## Feature Flags

| Flag | Default | Effect |
|---|---|---|
| `FEATURE_SHOW_SEEN=true` | off | Allows re-answering previously seen questions (bypasses duplicate guard in `submit-answer`) |

Set in `apps/api/.env.local`. Turn off for production to enforce spaced-repetition (each question seen once).

---

## Screens Reference

| Screen | Route | Tab? |
|---|---|---|
| Home | `/(app)/home` | Yes |
| Practice setup | `/(app)/practice` | Yes |
| Progress / Gap | `/(app)/gap` | Yes |
| Profile | `/(app)/profile` | Yes |
| Question (session) | `/(app)/question` | Hidden |
| Results | `/(app)/results` | Hidden |
| Notebook | `/(app)/notebook` | Hidden |
| Study Plan | `/(app)/study-plan` | Hidden |
| Achievements | `/(app)/achievements` | Hidden |
| Session History | `/(app)/history` | Hidden |
| Diagnostic | `/(app)/diagnostic` | Hidden |
| Paywall | `/(app)/paywall` | Hidden |
