# 03 — API Endpoints

App: **Bubbl**  
Base URL: `https://api.bubbl.app` (Vercel deployment)  
All endpoints require `Authorization: Bearer <supabase_jwt>` header unless marked PUBLIC.

---

## Authentication Pattern (all routes)

```typescript
// lib/auth.ts — used in every route
import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new Response('Unauthorized', { status: 401 })
  }
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Response('Invalid token', { status: 401 })
  }
  return user
}
```

---

## Endpoints

---

### POST /api/paper
Assembles a new practice paper from the question bank.

**Request:**
```json
{
  "subject": "math",           // "math" | "english" | "combined"
  "focus": "psda",             // optional: null | "psda" | "vocab" | "sec" | "geometry" | "algebra" | "synthesis"
  "questionCount": 22          // optional: default 22 math, 27 english
}
```

**Response:**
```json
{
  "paperId": "uuid",
  "subject": "math",
  "focus": "psda",
  "questions": [
    {
      "id": "uuid",
      "number": 1,
      "domain": "PSDA",
      "skill": "Scatterplot interpretation",
      "cb_skill_code": "PSA-01",
      "difficulty": "Medium",
      "difficulty_rating": 500,
      "passage": null,
      "stem": "The scatterplot shows the relationship between...",
      "choices": {
        "A": "0.25",
        "B": "0.75",
        "C": "1.50",
        "D": "2.00"
      },
      "grid_in": false
    }
    // ... 21 more questions
    // NOTE: correct answer and explanation NOT included here
    // They are returned only after the student submits each answer
  ]
}
```

**Errors:**
- `401` — invalid or missing token
- `403` — free user has exceeded 2 papers this week
- `404` — not enough unseen questions in bank for this domain/difficulty
- `500` — database error

**Logic:**
```
1. Verify JWT → get userId
2. Check profile.plan and papers_this_week:
   - If free AND papers_this_week >= 2 → return 403
3. Get all domain_ability scores for this user
4. Determine domain weights based on subject + focus + ability
5. For each domain, query questions:
   SELECT * FROM questions
   WHERE subject = $subject
   AND domain = $domain
   AND difficulty_rating BETWEEN $abilityLow AND $abilityHigh
   AND id NOT IN (SELECT question_id FROM seen_questions WHERE user_id = $userId)
   ORDER BY times_seen ASC
   LIMIT $count * 3    -- fetch 3x, then sample by difficulty distribution
6. Sample to hit difficulty distribution (25% Easy, 45% Med, 25% Hard, 5% Hardest)
7. Shuffle final list
8. Insert paper record into papers table
9. Increment profile.papers_this_week
10. Return questions (without answers)
```

**Domain weight logic:**
```typescript
function getDomainWeights(subject, focus, abilityMap) {
  if (subject === 'math') {
    if (focus === 'psda') return { PSDA: 14, Algebra: 3, 'Advanced Math': 3, Geometry: 2 }
    if (focus === 'geometry') return { Geometry: 12, 'Advanced Math': 4, Algebra: 4, PSDA: 2 }
    if (focus === 'algebra') return { Algebra: 14, 'Advanced Math': 4, PSDA: 2, Geometry: 2 }
    // Auto (gap-driven): weight toward lowest ability domains
    return autoWeightByAbility(abilityMap, {
      Algebra: 0.30, 'Advanced Math': 0.30, PSDA: 0.20, Geometry: 0.20
    }, 22)
  }
  if (subject === 'english') {
    if (focus === 'vocab') return { 'Craft & Structure': 16, 'Information & Ideas': 4, SEC: 4, Expression: 3 }
    if (focus === 'sec') return { SEC: 14, 'Craft & Structure': 4, Expression: 5, 'Information & Ideas': 4 }
    if (focus === 'synthesis') return { Expression: 14, 'Craft & Structure': 4, 'Information & Ideas': 5, SEC: 4 }
    return autoWeightByAbility(abilityMap, {
      'Craft & Structure': 0.30, 'Information & Ideas': 0.30, SEC: 0.25, Expression: 0.15
    }, 27)
  }
}
```

---

### POST /api/submit-answer
Submit a single answer during a practice session.

**Request:**
```json
{
  "paperId": "uuid",
  "questionId": "uuid",
  "answer": "B",               // "A"|"B"|"C"|"D" or numeric string for grid-in
  "timeTakenSecs": 47
}
```

**Response:**
```json
{
  "wasCorrect": true,
  "correctAnswer": "B",
  "abilityBefore": 420,
  "abilityAfter": 450,
  "nextDifficulty": "Medium",
  "abilityLabel": "Developing",
  "explanation": "The slope of a line of best fit is calculated by...",
  "trapChoice": "A",
  "trapExplanation": "Choice A is the most common mistake — students confuse the y-intercept with the slope",
  "strategy": "On the digital SAT, use Desmos: enter the two visible points and use the slope formula directly"
}
```

**Errors:**
- `401` — unauthorized
- `404` — question or paper not found
- `409` — this question was already answered in this paper

**Logic:**
```
1. Verify JWT → userId
2. Verify paper belongs to userId AND is in_progress
3. Look up question → get correct answer, domain, difficulty_rating
4. Check if wasCorrect = (answer === correct)
5. Get current domain_ability for this domain
6. Update ability:
   newAbility = updateAbility(currentAbility, difficulty_rating, wasCorrect)
7. Save to domain_ability table
8. Insert into seen_questions (user_id, question_id, was_correct)
9. Update questions.times_seen++ and optionally times_correct++
10. Return full response including explanation (now safe to reveal)
```

**Ability update formula:**
```typescript
function updateAbility(current: number, qRating: number, correct: boolean): number {
  const gap = Math.abs(current - qRating)
  const K = gap < 100 ? 30 : gap < 200 ? 20 : 10

  if (correct) {
    const boost = qRating >= current ? K : K * 0.4
    return Math.min(800, Math.round(current + boost))
  } else {
    const penalty = qRating <= current ? K : K * 0.4
    return Math.max(200, Math.round(current - penalty))
  }
}

function abilityLabel(ability: number): string {
  if (ability < 350) return 'Building'
  if (ability < 500) return 'Developing'
  if (ability < 575) return 'Solid'
  if (ability < 650) return 'Strong'
  if (ability < 725) return 'Advanced'
  return 'Expert'
}
```

---

### POST /api/complete-paper
Called when the student finishes all questions or exits mid-session.

**Request:**
```json
{
  "paperId": "uuid",
  "abandoned": false
}
```

**Response:**
```json
{
  "attemptId": "uuid",
  "score": 68,                  // percentage 0–100
  "correctCount": 15,
  "totalQuestions": 22,
  "domainResults": {
    "PSDA": { "correct": 2, "total": 5, "avgTimeSecs": 89 },
    "Algebra": { "correct": 5, "total": 5, "avgTimeSecs": 34 },
    "Advanced Math": { "correct": 4, "total": 7, "avgTimeSecs": 58 },
    "Geometry": { "correct": 4, "total": 5, "avgTimeSecs": 71 }
  },
  "gapAnalysisReady": true,     // true if this was attempt #3, 6, 9...
  "papersUntilGapAnalysis": 0   // 0 means run gap analysis now
}
```

**Logic:**
```
1. Verify JWT → userId
2. Mark paper as completed (or abandoned)
3. Compute aggregate scores from seen_questions for this paper
4. Insert attempt record with full domain_results breakdown
5. Increment gap_profile.papers_since_update
6. If papers_since_update >= 3: set gapAnalysisReady = true
7. Return summary
```

---

### POST /api/gap-analysis
Runs Claude Haiku analysis on the student's recent attempts. Call only when `complete-paper` returns `gapAnalysisReady: true`.

**Request:**
```json
{
  "lookbackPapers": 3           // optional, default 3
}
```

**Response:**
```json
{
  "domainScores": {
    "Algebra": 85,
    "Advanced Math": 62,
    "PSDA": 44,
    "Geometry": 71,
    "Craft & Structure": 38,
    "Information & Ideas": 74,
    "SEC": 81,
    "Expression": 55
  },
  "estimatedScoreLow": 610,
  "estimatedScoreHigh": 660,
  "topGaps": [
    {
      "domain": "Craft & Structure",
      "score": 38,
      "insight": "Vocabulary questions: confusing word register (formal/informal) with meaning. Missing 3 of 4 vocab questions consistently."
    },
    {
      "domain": "PSDA",
      "score": 44,
      "insight": "Scatterplot slope correct but percent chain questions (PSA-04) failing. Review multi-step percentage calculations."
    }
  ],
  "recommendedNext": "english vocab",
  "encouragement": "Your Algebra jumped from 71 to 85 in just 3 sessions — that same focus on PSDA will get you there."
}
```

**Errors:**
- `401` — unauthorized
- `429` — rate limited (max 5 gap analysis calls per hour per user)
- `503` — Claude API unavailable

**Claude Haiku Prompt:**
```
You are an SAT tutor for the Bubbl app analyzing a student's recent practice performance.

STUDENT PERFORMANCE (last ${lookbackPapers} papers):
${JSON.stringify(recentAttempts, null, 2)}

Domain ability scores (200-800 scale, 500=average):
${JSON.stringify(domainAbilities, null, 2)}

Analyze this data and return ONLY valid JSON in this exact format:
{
  "domain_scores": {
    "Algebra": <0-100>,
    "Advanced Math": <0-100>,
    "PSDA": <0-100>,
    "Geometry": <0-100>,
    "Craft & Structure": <0-100>,
    "Information & Ideas": <0-100>,
    "SEC": <0-100>,
    "Expression": <0-100>
  },
  "estimated_score_low": <400-1600>,
  "estimated_score_high": <400-1600>,
  "top_gaps": [
    {
      "domain": "<domain name>",
      "score": <0-100>,
      "insight": "<specific, actionable, 1-2 sentences — name the exact skill failing, not just the domain>"
    }
  ],
  "recommended_next": "<exact focus keyword: 'math psda' | 'english vocab' | 'math geometry' | 'english sec' | 'english synthesis'>",
  "encouragement": "<one sentence, specific and genuine — reference actual improvement or a specific strength you see>"
}

Rules:
- top_gaps: list only the 2-3 lowest-scoring domains
- insight must name the specific skill code failing, not just "needs more practice"
- estimated_score: map domain_scores to SAT scale (each domain = 200 pts of the 1600 total)
- Return JSON only, no preamble
```

---

### GET /api/subscription
Check current plan status.

**Response:**
```json
{
  "plan": "free",
  "papersThisWeek": 1,
  "papersAllowed": 2,
  "subscriptionEndAt": null
}
```

---

### POST /api/subscription/create-checkout
Create Stripe checkout session for premium upgrade.

**Request:**
```json
{
  "priceId": "price_xxx"        // Stripe price ID for $9.99/month
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx"  // for Stripe payment sheet in app
}
```

---

### POST /api/webhook/stripe
Receives Stripe subscription lifecycle events. No auth header — verified via Stripe signature.

**Handled events:**
- `customer.subscription.created` → set plan = 'premium', save subscription_id
- `customer.subscription.updated` → update subscription_end_at
- `customer.subscription.deleted` → set plan = 'free', clear subscription fields
- `invoice.payment_failed` → (future: send push notification)

```typescript
// Full implementation
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated') {
    await supabase.from('profiles')
      .update({
        plan: 'premium',
        stripe_subscription_id: subscription.id,
        subscription_end_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('profiles')
      .update({
        plan: 'free',
        stripe_subscription_id: null,
        subscription_end_at: null
      })
      .eq('stripe_customer_id', customerId)
  }

  return new Response('OK', { status: 200 })
}
```

---

## Rate Limiting (Edge Middleware)

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (use Upstash Redis for production)
const limitMap = new Map<string, { count: number; reset: number }>()

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/gap-analysis':    { max: 5,   windowMs: 60 * 60 * 1000 },  // 5/hour
  '/api/paper':           { max: 20,  windowMs: 60 * 60 * 1000 },  // 20/hour
  '/api/submit-answer':   { max: 200, windowMs: 60 * 60 * 1000 },  // 200/hour
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const limit = LIMITS[path]
  if (!limit) return NextResponse.next()

  const key = `${req.ip}-${path}`
  const now = Date.now()
  const record = limitMap.get(key)

  if (record && now < record.reset) {
    if (record.count >= limit.max) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((record.reset - now) / 1000)) }
      })
    }
    record.count++
  } else {
    limitMap.set(key, { count: 1, reset: now + limit.windowMs })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/gap-analysis', '/api/paper', '/api/submit-answer']
}
```
