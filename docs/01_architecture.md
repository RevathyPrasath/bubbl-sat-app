# 01 — System Architecture

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT'S PHONE                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              React Native App (Expo)                    │   │
│   │                                                         │   │
│   │  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│   │  │Diagnostic │  │Practice  │  │  Gap Dashboard       │ │   │
│   │  │  Quiz     │  │  Paper   │  │  (Radar Chart)       │ │   │
│   │  └─────┬─────┘  └────┬─────┘  └──────────┬───────────┘ │   │
│   │        │             │                    │             │   │
│   │  ┌─────▼─────────────▼────────────────────▼───────────┐ │   │
│   │  │         Supabase JS Client (Auth + DB)             │ │   │
│   │  │         Tokens stored in Expo SecureStore          │ │   │
│   │  └─────────────────────┬───────────────────────────── ┘ │   │
│   └────────────────────────┼────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS + JWT
┌────────────────────────────▼────────────────────────────────────┐
│                   VERCEL (Next.js API Routes)                   │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ /api/paper      │  │/api/submit   │  │ /api/gap-analysis  │ │
│  │ Assembles paper │  │Scores answer │  │ Calls Claude API   │ │
│  │ from question   │  │Updates ability  │ Returns insights   │ │
│  │ bank by domain/ │  │score in DB   │  │                    │ │
│  │ difficulty      │  │              │  │                    │ │
│  └────────┬────────┘  └──────┬───────┘  └────────┬───────────┘ │
│           │                  │                    │             │
│  ┌────────▼──────────────────▼────────────────────▼───────────┐ │
│  │              JWT Verification (every route)                │ │
│  │              Rate Limiting (edge middleware)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │ /api/webhook/    │  │ /api/subscription                    │ │
│  │ stripe           │  │ Check plan status                    │ │
│  │ Handles upgrade/ │  │                                      │ │
│  │ downgrade events │  │                                      │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└──────────┬─────────────────────────────┬────────────────────────┘
           │                             │
  ┌────────▼─────────┐         ┌─────────▼──────┐
  │    SUPABASE      │         │  CLAUDE API    │
  │                  │         │  (Haiku model) │
  │  PostgreSQL DB   │         │  Gap analysis  │
  │  Auth (JWT)      │         │  only — not    │
  │  Row Level Sec   │         │  question gen  │
  │  5,000 questions │         │                │
  │  User profiles   │         │ ~$0.0003/call  │
  │  Attempts + gaps │         │                │
  └──────────────────┘         └────────────────┘

THIRD-PARTY SERVICES (mobile SDK, no backend involvement):
  ┌──────────────┐    ┌────────────────────────────────────────┐
  │  ADMOB SDK   │    │           STRIPE SDK                   │
  │  (in app)    │    │  Payment sheet in app                  │
  │  Banner ads  │    │  Webhooks → Vercel /api/webhook/stripe │
  │  Interstitial│    │                                        │
  └──────────────┘    └────────────────────────────────────────┘
```

---

## 2. Tech Stack Decisions

### Mobile — React Native with Expo

**Why React Native:**
- Single codebase for iOS and Android
- Large ecosystem (Stripe SDK, AdMob, Supabase all have RN libraries)
- Expo managed workflow = no Xcode/Android Studio needed for most work

**Why Expo:**
- EAS Build handles App Store + Play Store submissions
- OTA (over-the-air) updates via Expo Updates — fix bugs without App Store review
- SecureStore for encrypted token storage
- Built-in dev tools

**Key Expo packages:**
```
expo-secure-store          — encrypted token storage
expo-router                — file-based navigation
react-native-svg           — radar chart for gap dashboard
@stripe/stripe-react-native — payment sheet
react-native-google-mobile-ads — AdMob
@supabase/supabase-js      — database + auth client
```

### Backend — Next.js on Vercel

**Why Next.js:**
- API routes = no separate Express server needed
- Vercel deployment is zero-config
- Edge middleware for rate limiting
- Free tier handles ~100GB bandwidth and millions of function invocations

**Why not a dedicated server (Railway, Render, etc.):**
- Serverless is cheaper at low scale (pay per invocation, not idle time)
- Vercel auto-scales without configuration
- No server maintenance

### Database + Auth — Supabase

**Why Supabase:**
- PostgreSQL with Row Level Security = bulletproof data isolation
- Built-in Auth (email, Google, Apple OAuth)
- Free tier: 500MB DB, 50K MAU, 2GB bandwidth
- Realtime subscriptions (useful for future parent dashboard)
- No extra auth service needed (vs Firebase + separate DB)

**Why not Firebase:**
- Firestore is document-based — harder to do complex queries (question filtering by domain + difficulty + not-seen-by-user)
- No RLS equivalent — security is all in app code, less safe
- More expensive at scale

### Gap Analysis — Claude Haiku API

**Why Haiku and not Opus/Sonnet:**
- Gap analysis is structured JSON in, structured JSON out
- No complex reasoning needed — just pattern recognition over numbers
- Haiku cost: ~$0.25 per million input tokens = ~$0.0003 per gap analysis call
- At 10,000 users × once/week = $12/month max

**Why NOT dynamic question generation:**
- Claude API for question generation at scale: $0.50–2.00 per paper
- At 10,000 users × 3 papers/week = $60,000–240,000/month — not viable
- Pre-generated bank: $0 per paper served, unlimited scale

### Payments — Stripe

**Why Stripe:**
- Best developer experience
- Native mobile SDK (no web redirect needed)
- Webhooks for subscription state management
- Handles tax, refunds, dunning automatically
- 2.9% + 30¢ per transaction (industry standard)

### Ads — Google AdMob

**Why AdMob:**
- Largest mobile ad network = highest fill rates and eCPM
- Native SDK for React Native
- eCPM for education apps: $8–15 (higher than average)
- Simple to integrate and mediate

---

## 3. Data Flow — Practice Session

```
1. Student taps "Start Practice"
   │
2. App calls POST /api/paper
   { subject: 'math', focus: 'PSDA', userId: 'xxx' }
   │
3. API reads student's domain_ability from Supabase
   → algebra: 580, PSDA: 420, geometry: 510 ...
   │
4. API queries question bank:
   SELECT * FROM questions
   WHERE domain = 'PSDA'
   AND difficulty_rating BETWEEN 300 AND 550   ← matches ability 420
   AND id NOT IN (user's seen question IDs)
   ORDER BY times_seen ASC
   LIMIT 5
   (repeated for each domain based on weighting)
   │
5. API shuffles questions, saves paper record to DB
   Returns 22 questions as JSON
   │
6. App renders Q1, student answers
   │
7. App calls POST /api/submit-answer
   { userId, questionId, answer: 'B', timeTaken: 47 }
   │
8. API checks answer → correct
   Updates domain_ability: 420 → 450
   Updates question stats: times_seen++, times_correct++
   Returns: { correct: true, newAbility: 450,
              nextDifficulty: 'Medium',
              explanation: '...', strategy: '...' }
   │
9. App shows feedback screen (correct + explanation)
   If free tier AND question 10: show AdMob banner
   │
10. Student taps "Next" → Q2 from pre-loaded paper
    (no API call for next question — already downloaded)
   │
11. After Q22: POST /api/complete-paper
    Saves full attempt record
   │
12. If this was attempt #3, 6, 9...:
    POST /api/gap-analysis (calls Claude Haiku)
    Returns domain scores + insights JSON
    App shows gap report screen
```

---

## 4. Data Flow — Gap Analysis

```
POST /api/gap-analysis
      │
      ▼
Pull last 3 attempts from DB with per-question breakdown:
[
  { domain: 'PSDA', correct: 2, total: 5, avgTime: 89 },
  { domain: 'Algebra', correct: 4, total: 5, avgTime: 34 },
  ...
]
      │
      ▼
Build Claude Haiku prompt (see docs/03_api.md for full prompt)
      │
      ▼
Claude Haiku API call (~800 tokens in, ~400 out)
Cost: ~$0.0003
      │
      ▼
Parse JSON response:
{
  domain_scores: { PSDA: 45, Algebra: 82, ... },
  top_gaps: [ ... ],
  recommended_next: 'math psda',
  encouragement: '...'
}
      │
      ▼
Update gap_profile table in Supabase
Return to app → render gap dashboard + insights card
```

---

## 5. Offline Strategy

The app must handle no-network gracefully:

| Feature | Online | Offline |
|---------|--------|---------|
| Start new paper | Yes — requires API | No — show cached last paper |
| Answer questions | Yes — submits in real time | Cache answers locally, sync on reconnect |
| View gap dashboard | Yes — live data | Show last cached gap profile |
| View attempt history | Yes | Show last 3 cached attempts |
| Gap analysis report | Yes — requires Claude API | Show last cached report |

Implementation: use React Query with persistence adapter to cache API responses to device storage.

---

## 6. Folder Structure (Repository)

```
sat-app/
├── apps/
│   └── mobile/                 ← Expo React Native app
│       ├── app/                ← expo-router pages
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── signup.tsx
│       │   ├── (tabs)/
│       │   │   ├── index.tsx       ← Home / dashboard
│       │   │   ├── practice.tsx    ← Start practice
│       │   │   ├── history.tsx     ← Attempt history
│       │   │   └── profile.tsx     ← Account + subscription
│       │   ├── paper/
│       │   │   ├── [id].tsx        ← Active paper session
│       │   │   └── results.tsx     ← Post-paper results
│       │   ├── gap/
│       │   │   └── index.tsx       ← Full gap dashboard
│       │   └── diagnostic/
│       │       └── index.tsx       ← Onboarding diagnostic
│       ├── components/
│       │   ├── QuestionCard.tsx
│       │   ├── AnswerChoices.tsx
│       │   ├── ExplanationPanel.tsx
│       │   ├── AbilityBar.tsx
│       │   ├── RadarChart.tsx
│       │   ├── GapInsightCard.tsx
│       │   └── AdBanner.tsx
│       ├── lib/
│       │   ├── supabase.ts         ← Supabase client with SecureStore
│       │   ├── adaptive.ts         ← ability update + next difficulty logic
│       │   └── hooks/
│       │       ├── usePaper.ts
│       │       ├── useGapProfile.ts
│       │       └── useSubscription.ts
│       └── constants/
│           ├── domains.ts          ← domain names, colors, icons
│           └── difficulties.ts     ← rating thresholds + labels
│
└── apps/
    └── api/                    ← Next.js backend
        ├── app/api/
        │   ├── paper/route.ts
        │   ├── submit-answer/route.ts
        │   ├── complete-paper/route.ts
        │   ├── gap-analysis/route.ts
        │   ├── subscription/route.ts
        │   └── webhook/stripe/route.ts
        ├── lib/
        │   ├── supabase-admin.ts   ← service key client
        │   ├── auth.ts             ← JWT verification helper
        │   ├── adaptive.ts         ← server-side ability calculations
        │   └── claude.ts           ← gap analysis prompt builder
        └── middleware.ts           ← rate limiting edge middleware
```
