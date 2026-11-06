# Bubbl — Adaptive SAT Prep App

An adaptive SAT practice app for high school students. Free with ads, premium subscription for unlimited access. Questions are pre-generated and stored in a database — no AI API cost per question. Claude API is used only for personalized gap analysis.

## Folder Structure

```
SAT-App/
├── README.md                  ← you are here
├── SPECIFICATION.md           ← master product spec (start here)
├── docs/
│   ├── 01_architecture.md     ← system design + tech stack
│   ├── 02_database.md         ← full Postgres schema + RLS policies
│   ├── 03_api.md              ← all backend API endpoints
│   ├── 04_adaptive_engine.md  ← difficulty adaptation algorithm
│   ├── 05_screens.md          ← all app screens + user flows
│   ├── 06_question_bank.md    ← question structure + CB skill codes
│   ├── 07_monetization.md     ← free/premium tiers + Stripe + AdMob
│   ├── 08_security.md         ← auth, RLS, secrets, rate limiting
│   └── 09_deployment.md       ← step-by-step deployment checklist
└── schema/
    ├── migrations/
    │   └── 001_initial.sql    ← run this in Supabase SQL editor
    └── seed/
        └── README.md          ← how to bulk-seed question bank
```

## Quick Tech Summary

| Layer | Technology | Cost |
|-------|-----------|------|
| Mobile | React Native + Expo | Free |
| Backend | Next.js on Vercel | Free tier |
| Database + Auth | Supabase | Free tier (50K users) |
| Payments | Stripe | 2.9% + 30¢ per transaction |
| Ads | Google AdMob | Revenue share |
| Gap Analysis AI | Claude Haiku API | ~$0.0003/call |
| Domain | Namecheap | ~$12/year |
| App Store | Apple Developer | $99/year |
| Play Store | Google Play | $25 one-time |

**Total cost to launch: ~$136 first year, ~$0/month until scale.**

## Read Order

1. `SPECIFICATION.md` — product overview and goals
2. `docs/01_architecture.md` — how all pieces connect
3. `docs/02_database.md` — data model
4. `docs/04_adaptive_engine.md` — the core algorithm
5. `docs/05_screens.md` — what the app looks like
6. `docs/09_deployment.md` — how to ship it
