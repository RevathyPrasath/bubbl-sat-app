# 05 — App Screens & User Flows

App: **Bubbl**

---

## Navigation Structure

```
Bubbl
├── (auth)                      ← unauthenticated stack
│   ├── Welcome                 ← splash / value prop
│   ├── Login
│   └── Signup
│
└── (app)                       ← authenticated, tab bar at bottom
    ├── Home (tab 1)            ← dashboard + today's recommendation
    ├── Practice (tab 2)        ← start a session
    ├── Progress (tab 3)        ← gap dashboard + history
    └── Profile (tab 4)         ← account, subscription, settings
    │
    ├── /diagnostic             ← one-time onboarding flow
    ├── /paper/:id              ← active question session
    ├── /paper/:id/results      ← post-paper summary
    └── /gap                    ← full gap analysis report
```

---

## Screen 1 — Welcome

```
┌─────────────────────────────┐
│                             │
│                             │
│         🫧 bubbl            │
│                             │
│    SAT prep that adapts     │
│      to how YOU think       │
│                             │
│  ┌─────────────────────┐    │
│  │   Get Started Free  │    │
│  └─────────────────────┘    │
│                             │
│     Already have an         │
│     account? Log in         │
│                             │
│                             │
│  ─────────────────────────  │
│  ✓ 5,000 real SAT questions │
│  ✓ Adapts to your level     │
│  ✓ Free forever             │
└─────────────────────────────┘
```

**States:** Default only.  
**Actions:** Get Started → Signup screen | Log in → Login screen

---

## Screen 2 — Signup

```
┌─────────────────────────────┐
│  ← Back    Create Account   │
│                             │
│  ┌─────────────────────┐    │
│  │ G  Continue with    │    │
│  │    Google           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ 🍎 Continue with   │    │
│  │    Apple            │    │
│  └─────────────────────┘    │
│                             │
│  ─────────  or  ─────────   │
│                             │
│  Full name                  │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Email                      │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Password                   │
│  ┌─────────────────────┐    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Grade                      │
│  ┌──────────────────┐       │
│  │ 11th grade    ▼  │       │
│  └──────────────────┘       │
│                             │
│  ┌─────────────────────┐    │
│  │    Create Account   │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**Apple Sign In is required by App Store rules** when any OAuth is offered.

---

## Screen 3 — Diagnostic Quiz (first-time only)

Shown once, immediately after account creation. 10 questions, 2 per domain.

```
┌─────────────────────────────┐
│  Let's see where you stand  │
│                             │
│  10 quick questions to      │
│  personalize your practice  │
│                             │
│  ●●●●●○○○○○   5 of 10      │
│                             │
│  ┌─────────────────────┐    │
│  │  PSDA · Medium      │    │
│  │                     │    │
│  │  A scatterplot shows│    │
│  │  the relationship   │    │
│  │  between x and y.   │    │
│  │  A line of best fit │    │
│  │  is also shown.     │    │
│  │                     │    │
│  │  Which of the       │    │
│  │  following is       │    │
│  │  closest to the     │    │
│  │  slope?             │    │
│  │                     │    │
│  │  [graph image]      │    │
│  └─────────────────────┘    │
│                             │
│  ○ A.  0.25                 │
│  ○ B.  0.75                 │
│  ○ C.  1.50                 │
│  ○ D.  2.00                 │
│                             │
│  ┌─────────────────────┐    │
│  │      Submit         │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

After Q10: brief loading → Home screen with initial gap profile set.

---

## Screen 4 — Home (Tab 1)

```
┌─────────────────────────────┐
│  bubbl          [avatar] ⚙  │
│                             │
│  Good morning, Riya!        │
│  Your level: 590 · Strong   │
│                             │
│  ┌─────────────────────┐    │
│  │ 📌 Recommended      │    │
│  │                     │    │
│  │  Math — PSDA Focus  │    │
│  │  "Percent chain     │    │
│  │   questions are     │    │
│  │   your biggest gap" │    │
│  │                     │    │
│  │  [Start Practice →] │    │
│  └─────────────────────┘    │
│                             │
│  Your Progress              │
│  ──────────────────────     │
│  Math      ████████░░  78%  │
│  English   ██████░░░░  61%  │
│                             │
│  This week                  │
│  ──────────────────────     │
│  Papers done   1 / 2        │
│  Streak        3 days 🔥    │
│                             │
│  Recent Activity            │
│  ──────────────────────     │
│  Math PSDA · 68% · 2h ago   │
│  English Vocab · 54% · 1d   │
└─────────────────────────────┘
│ 🏠 Home  📝 Practice  📊 Progress  👤 Profile │
```

---

## Screen 5 — Practice (Tab 2)

```
┌─────────────────────────────┐
│  Start Practice             │
│                             │
│  Subject                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ Math │ │  En- │ │ Both │ │
│  │      │ │glish │ │      │ │
│  └──────┘ └──────┘ └──────┘ │
│                             │
│  Focus (optional)           │
│  ┌─────────────────────┐    │
│  │ Auto — close my gaps│    │  ← default, recommended
│  └─────────────────────┘    │
│  ┌────────┐ ┌────────┐      │
│  │  PSDA  │ │ Vocab  │      │
│  └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐      │
│  │Algebra │ │  SEC   │      │
│  └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐      │
│  │Geometry│ │Synthesis│     │
│  └────────┘ └────────┘      │
│                             │
│  22 questions · ~35 min     │
│                             │
│  ┌─────────────────────┐    │
│  │    Start Session    │    │
│  └─────────────────────┘    │
│                             │
│  🔒 Premium: Combined mode  │
│  Math + English in one run  │
└─────────────────────────────┘
```

---

## Screen 6 — Active Question

```
┌─────────────────────────────┐
│  Math · PSDA   Q7 / 22  ✕  │
│  ══════════════░░░░░  32%   │
│                             │
│  ┌─────────────────────┐    │
│  │ Medium              │    │
│  │                     │    │
│  │ The scatterplot     │    │
│  │ shows the           │    │
│  │ relationship        │    │
│  │ between hours       │    │
│  │ studied (x) and     │    │
│  │ test score (y).     │    │
│  │                     │    │
│  │ [scatterplot image] │    │
│  │                     │    │
│  │ Which of the        │    │
│  │ following is        │    │
│  │ closest to the      │    │
│  │ slope of the line   │    │
│  │ of best fit?        │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  A.  0.25           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  B.  0.75  ◀ tapped │    │  ← highlighted on tap
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  C.  1.50           │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  D.  2.00           │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │       Submit        │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**States:**
- Default (no selection): Submit button disabled
- Choice selected: Submit button active
- Grid-in: numeric keyboard shown, text input field instead of choices

---

## Screen 7 — Feedback (after submit)

```
── CORRECT ─────────────────── (green header)
┌─────────────────────────────┐
│  ✓  Correct!                │
│                             │
│  Your level:  590 → 620     │
│  ████████████░░ Strong      │
│                             │
│  Why B is correct:          │
│  ─────────────────────      │
│  The slope is rise/run.     │
│  Reading from the graph:    │
│  when x increases by 4,     │
│  y increases by 3. Slope    │
│  = 3/4 = 0.75               │
│                             │
│  ⚡ 800-Level Strategy:     │
│  On Desmos, enter the two   │
│  visible points and use     │
│  slope formula directly.    │
│                             │
│  Why others fail:           │
│  ──────────────────────     │
│  ⚠ A (0.25): Most common   │
│    trap — inverted the      │
│    rise/run fraction        │
│  C (1.50): Overestimated    │
│    the change in y          │
│  D (2.00): Read y-intercept │
│    instead of slope         │
│                             │
│  ┌─────────────────────┐    │
│  │    Next Question →  │    │
│  └─────────────────────┘    │
└─────────────────────────────┘

── WRONG ─────────────────────  (red header variant)
│  ✗  Not quite              │
│                             │
│  Your level:  590 → 560     │
│  ██████████░░░ Solid        │
│                             │
│  Correct answer: B (0.75)   │
│  You chose:      A (0.25)   │
│  [same explanation block]   │
```

**Ad placement (free tier only):** After Q11 feedback screen, show AdMob banner at bottom for 5 seconds before "Next Question" button activates.

---

## Screen 8 — Grid-In Question

```
┌─────────────────────────────┐
│  Math · Algebra  Q14 / 22  ✕│
│  ═════════════════░  63%    │
│                             │
│  ┌─────────────────────┐    │
│  │ Hard · Grid-In      │    │
│  │                     │    │
│  │ If 2x + 9y = 7 and  │    │
│  │ the system has at   │    │
│  │ least one solution, │    │
│  │ what could be the   │    │
│  │ value of y when     │    │
│  │ x = 5?              │    │
│  └─────────────────────┘    │
│                             │
│  Your answer:               │
│  ┌─────────────────────┐    │
│  │  -1/3               │    │  ← text input
│  └─────────────────────┘    │
│                             │
│  Enter as: integer, decimal,│
│  or fraction (e.g. 3/4)     │
│                             │
│  [numeric keyboard]         │
│  ┌──┐ ┌──┐ ┌──┐            │
│  │1 │ │2 │ │3 │            │
│  ├──┤ ├──┤ ├──┤            │
│  │4 │ │5 │ │6 │            │
│  ├──┤ ├──┤ ├──┤            │
│  │7 │ │8 │ │9 │            │
│  ├──┤ ├──┤ ├──┤            │
│  │- │ │0 │ │. │            │
│  └──┘ └──┘ └──┘  [/ ⌫]    │
│                             │
│  ┌─────────────────────┐    │
│  │       Submit        │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## Screen 9 — Paper Results

```
┌─────────────────────────────┐
│  Session Complete! 🎉        │
│                             │
│  Math · PSDA Focus          │
│  ──────────────────────     │
│       15 / 22               │
│         68%                 │
│  Time: 28 min 42 sec        │
│                             │
│  By Domain:                 │
│  ──────────────────────     │
│  PSDA          ██████░  60% │
│  Algebra       ████████ 80% │
│  Advanced Math ██████░  60% │
│  Geometry      ████████ 80% │
│                             │
│  Level changes:             │
│  ──────────────────────     │
│  PSDA     290 → 330  ↑ +40  │
│  Algebra  660 → 680  ↑ +20  │
│                             │
│  ┌─────────────────────┐    │
│  │   Review Answers    │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │   Start Next Paper  │    │
│  └─────────────────────┘    │
│                             │
│  ─── Gap Analysis Ready ─── │
│  Based on your last 3       │
│  papers, Bubbl has          │
│  personalized insights for  │
│  you.                       │
│  ┌─────────────────────┐    │
│  │  See My Gap Report  │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

**AdMob interstitial** plays full-screen before this screen shows (free tier only). 1 per completed paper.

---

## Screen 10 — Gap Dashboard (Progress Tab)

```
┌─────────────────────────────┐
│  Your Progress    bubbl     │
│                             │
│  Estimated SAT Score        │
│  ──────────────────────     │
│        630 – 680            │
│                             │
│  Skill Radar                │
│  ──────────────────────     │
│         Math                │
│    Alg ●────────────● 85%   │
│                    /        │
│  Geo  ●───────────●         │
│        \          |  78%    │
│         ●─────────● PSDA    │
│              44%            │
│         Adv Math 62%        │
│                             │
│  Top Gaps to Close          │
│  ──────────────────────     │
│  1. PSDA             44%    │
│     "Percent chains failing"│
│  2. Craft & Structure 38%   │
│     "Vocab: word register"  │
│                             │
│  ┌─────────────────────┐    │
│  │ Practice PSDA Now → │    │
│  └─────────────────────┘    │
│                             │
│  Recent Papers (last 7 days)│
│  ──────────────────────     │
│  Oct 27 · Math PSDA · 68%   │
│  Oct 26 · English Vocab· 54%│
│  Oct 25 · Math Mixed · 72%  │
│                             │
│  🔒 Premium: Full history + │
│  trend charts               │
└─────────────────────────────┘
```

---

## Screen 11 — Profile (Tab 4)

```
┌─────────────────────────────┐
│  Profile         bubbl      │
│                             │
│  [avatar]  Riya Srihari     │
│            Grade 11         │
│            Target: 1400     │
│                             │
│  ─── Plan ──────────────    │
│  Free Plan                  │
│  2 papers / week            │
│  Papers used this week: 1   │
│                             │
│  ┌─────────────────────┐    │
│  │  Upgrade to Premium │    │
│  │  $9.99 / month      │    │
│  │  Unlimited papers,  │    │
│  │  no ads, full gaps  │    │
│  └─────────────────────┘    │
│                             │
│  ─── Settings ───────────   │
│  Notifications        ON >  │
│  Dark Mode            ON >  │
│  Target SAT Score    1400 > │
│  Grade               11th > │
│                             │
│  ─── Account ────────────   │
│  Change Password         >  │
│  Privacy Policy          >  │
│  Terms of Service        >  │
│  Contact Support         >  │
│  Sign Out                >  │
└─────────────────────────────┘
```

---

## Screen 12 — Premium Upgrade

```
┌─────────────────────────────┐
│  ✕  Upgrade to Premium      │
│                             │
│       🫧 bubbl+             │
│                             │
│  ✓  Unlimited papers        │
│  ✓  No ads                  │
│  ✓  Full gap dashboard      │
│  ✓  Complete history        │
│  ✓  PDF downloads           │
│  ✓  Math + English combined │
│                             │
│  $9.99 / month              │
│  Cancel anytime             │
│                             │
│  ┌─────────────────────┐    │
│  │  Start Free Trial   │    │  ← 7-day free trial
│  │  (7 days free)      │    │
│  └─────────────────────┘    │
│                             │
│  ─── or ─────────────────   │
│                             │
│  $79.99 / year (save 33%)   │
│  ┌─────────────────────┐    │
│  │   Get Annual Plan   │    │
│  └─────────────────────┘    │
│                             │
│  Secure payment via Stripe  │
│  Billed monthly · Cancel    │
│  anytime in App Settings    │
└─────────────────────────────┘
```

---

## Ad Placement Rules (Free Tier Only)

| Ad Type | Placement | Frequency |
|---------|-----------|-----------|
| AdMob Banner | Bottom of feedback screen, Q11 only | Once per paper |
| AdMob Interstitial | Before results screen | Once per paper |
| No ads on | Question screen, first 10 feedback screens | Always |

**Never show ads:**
- During an active question (breaks focus)
- On the first question of a session
- More than once per completed paper (per ad type)
- To premium users

---

## Dark Mode (Default)

All colors are dark-mode first:

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | #0D0D0D | #FFFFFF |
| Card background | #1A1A1A | #F5F5F5 |
| Primary text | #FFFFFF | #111111 |
| Secondary text | #888888 | #555555 |
| Accent (correct) | #22C55E | #16A34A |
| Accent (wrong) | #EF4444 | #DC2626 |
| Brand color | #6366F1 | #4F46E5 |
| Progress bar | #6366F1 | #4F46E5 |
