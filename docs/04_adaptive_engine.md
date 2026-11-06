# 04 — Adaptive Engine

App: **Bubbl**

---

## Overview

Bubbl uses a per-domain ability tracking system inspired by the Elo rating used in chess and the IRT (Item Response Theory) used in real adaptive testing. Every domain has its own ability score (200–800). Questions are selected to match the student's current ability in that domain. After each answer, the ability score is updated.

This means a student can be "Strong" in Algebra (ability 660) and simultaneously "Building" in PSDA (ability 290) — and the app will serve them Hard Algebra questions and Easy PSDA questions in the same session.

---

## Ability Scale

| Range | Label | SAT Score Equivalent | Description |
|-------|-------|---------------------|-------------|
| 200–349 | Building | 200–400 | Missing fundamentals |
| 350–499 | Developing | 400–520 | Knows basics, inconsistent |
| 500–574 | Solid | 520–580 | Reliable on Medium questions |
| 575–649 | Strong | 580–650 | Handles Hard questions |
| 650–724 | Advanced | 650–730 | Near-mastery |
| 725–800 | Expert | 730–800 | College Board Level 5 |

---

## Difficulty Rating Map

Each question in the bank has a `difficulty_rating` integer:

| CB Level | Bubbl Label | difficulty_rating |
|----------|-------------|------------------|
| Level 1–2 | Easy | 300 |
| Level 3 | Medium | 500 |
| Level 4 | Hard | 650 |
| Level 5 | Hardest | 800 |

---

## Question Selection

When the app requests the next question for a domain, it selects from a ±1 difficulty band around the student's current ability. This prevents jarring jumps (e.g., Easy directly to Hardest).

```typescript
function abilityToTargetRating(ability: number): number {
  if (ability < 350) return 300   // Easy
  if (ability < 575) return 500   // Medium
  if (ability < 725) return 650   // Hard
  return 800                       // Hardest
}

function getRatingBand(ability: number): [number, number] {
  const target = abilityToTargetRating(ability)
  // Allow one step above and one step below to avoid rigidity
  const lower = target === 300 ? 300 : target - 150
  const upper = target === 800 ? 800 : target + 150
  return [lower, upper]
}

// Example:
// ability = 580 → target = 650 (Hard)
// band = [500, 800]
// So student may get Medium, Hard, or Hardest questions — mostly Hard
```

SQL query for question selection:
```sql
SELECT * FROM questions
WHERE subject = $subject
  AND domain = $domain
  AND difficulty_rating >= $bandLow
  AND difficulty_rating <= $bandHigh
  AND id NOT IN (
    SELECT question_id FROM seen_questions WHERE user_id = $userId
  )
ORDER BY times_seen ASC     -- rotate least-used questions first
LIMIT $count
```

---

## Ability Update Formula

After each answered question, the ability score for that domain is updated:

```typescript
function updateAbility(
  currentAbility: number,
  questionRating: number,
  wasCorrect: boolean
): number {
  // K-factor: how much one question shifts the estimate
  // High K when the question difficulty matches the student's level
  // (most informative about true ability)
  const gap = Math.abs(currentAbility - questionRating)
  const K = gap < 100 ? 30 : gap < 200 ? 20 : 10

  if (wasCorrect) {
    // Bigger boost for answering questions harder than your current ability
    // Small boost for answering easy questions (expected, less informative)
    const boost = questionRating >= currentAbility ? K : K * 0.4
    return Math.min(800, Math.round(currentAbility + boost))
  } else {
    // Bigger penalty for missing questions at or below your ability
    // Small penalty for missing questions harder than your ability (expected)
    const penalty = questionRating <= currentAbility ? K : K * 0.4
    return Math.max(200, Math.round(currentAbility - penalty))
  }
}
```

### K-Factor Explanation

The K-factor controls how much one question moves the ability estimate:

- **K=30** (gap < 100): Question is right at the student's level — very informative. Large update.
- **K=20** (gap 100–200): Question is one level above/below — moderately informative.
- **K=10** (gap > 200): Question is far from the student's level — less reliable signal. Small update.

This prevents a single lucky correct answer on a very hard question from artificially inflating the ability estimate.

---

## Session Trace Example

Student starts with PSDA ability = 500 (Medium/Solid):

```
Q1  Medium (500)  → Correct  → gap=0,   K=30, boost=30  → ability 530
Q2  Medium (500)  → Correct  → gap=30,  K=30, boost=30  → ability 560
Q3  Medium (500)  → Correct  → gap=60,  K=30, boost=30  → ability 590
                                         ↑ crosses 575 threshold
Q4  Hard   (650)  → Wrong    → gap=60,  K=30, pen=12    → ability 578
    (wrong on Hard: questionRating > currentAbility → penalty × 0.4 = 12)
Q5  Hard   (650)  → Correct  → gap=72,  K=20, boost=20  → ability 598
Q6  Hard   (650)  → Correct  → gap=52,  K=30, boost=30  → ability 628
Q7  Hard   (650)  → Wrong    → gap=22,  K=30, pen=30    → ability 598
    (wrong on Hard at ability 628: qRating barely > ability → still penalty×0.4? 
     No — qRating(650) > currentAbility(628) → penalty × 0.4 = 12)
     → ability 616
Q8  Hard   (650)  → Correct  → gap=34,  K=30, boost=30  → ability 646
Q9  Hard   (650)  → Correct  → gap=4,   K=30, boost=30  → ability 676
                                          ↑ crosses 650 → next: Hardest
Q10 Hardest(800)  → Wrong    → gap=124, K=20, pen=8     → ability 668
    (wrong on Hardest: qRating(800) > ability(676) → penalty × 0.4 = 8)
Q11 Hard   (650)  → Correct  → gap=18,  K=30, boost=30  → ability 698
Q12 Hardest(800)  → Correct  → gap=102, K=20, boost=20  → ability 718
                                          ↑ approaching Expert threshold (725)
```

---

## Multi-Domain Paper Assembly

A full 22-question Math paper covers all 4 domains. Each question uses the domain-specific ability for selection and update. The overall paper difficulty naturally matches the student's heterogeneous skill profile.

```typescript
interface DomainAbilityMap {
  'Algebra': number        // e.g., 660
  'Advanced Math': number  // e.g., 520
  'PSDA': number           // e.g., 290
  'Geometry': number       // e.g., 480
}

// Paper question allocation (auto/gap-driven):
function allocateQuestions(
  abilities: DomainAbilityMap,
  totalQuestions: number,
  baseWeights: Record<string, number>  // { Algebra: 0.30, AdvMath: 0.30, PSDA: 0.20, Geo: 0.20 }
): Record<string, number> {
  // Boost weight for domains with lower ability
  // (more practice where it's needed most)
  const gapBoost = Object.entries(abilities).reduce((acc, [domain, ability]) => {
    // Ability 500 = no boost; ability 300 = +50% boost; ability 700 = -20% boost
    acc[domain] = 1 + (500 - ability) / 1000
    return acc
  }, {} as Record<string, number>)

  const rawWeights = Object.entries(baseWeights).map(([domain, w]) => ({
    domain,
    weight: w * (gapBoost[domain] ?? 1)
  }))

  const totalWeight = rawWeights.reduce((s, x) => s + x.weight, 0)

  return Object.fromEntries(
    rawWeights.map(({ domain, weight }) => [
      domain,
      Math.max(2, Math.round((weight / totalWeight) * totalQuestions))
    ])
  )
}

// Example output for abilities above:
// { Algebra: 5, 'Advanced Math': 6, PSDA: 8, Geometry: 3 }
// PSDA gets 8 questions because ability is lowest (290 → big gap boost)
```

---

## Difficulty Distribution Target

Within the questions selected for each domain, sample to hit the difficulty distribution:

```typescript
function sampleByDifficulty<T extends { difficulty_rating: number }>(
  questions: T[],
  count: number
): T[] {
  // Target: 25% Easy, 45% Medium, 25% Hard, 5% Hardest
  const targets = {
    300: Math.round(count * 0.25),   // Easy
    500: Math.round(count * 0.45),   // Medium
    650: Math.round(count * 0.25),   // Hard
    800: Math.max(1, Math.round(count * 0.05)),  // Hardest (min 1)
  }

  const byDifficulty = {
    300: questions.filter(q => q.difficulty_rating === 300),
    500: questions.filter(q => q.difficulty_rating === 500),
    650: questions.filter(q => q.difficulty_rating === 650),
    800: questions.filter(q => q.difficulty_rating === 800),
  }

  const selected: T[] = []
  for (const [rating, target] of Object.entries(targets)) {
    const pool = byDifficulty[Number(rating)]
    selected.push(...pool.slice(0, target))
  }

  return selected
}
```

Note: when a student is Expert-level in a domain, they'll receive mostly Hard/Hardest and the Easy/Medium slots may be filled from adjacent domains. The distribution is a target, not a hard constraint.

---

## First-Time Users — Diagnostic Calibration

New users start at 500 (Medium) for all domains. The 10-question diagnostic (2 per domain) provides a faster initial estimate:

```typescript
// After diagnostic: set initial ability based on correct rate per domain
function setInitialAbility(domain: string, correct: number, total: number): number {
  const rate = correct / total
  if (rate === 0)         return 300  // all wrong → Easy
  if (rate <= 0.25)       return 380
  if (rate <= 0.50)       return 460
  if (rate <= 0.75)       return 540
  if (rate < 1.0)         return 620
  return 700                          // all correct → Hard+
}
```

After the diagnostic, the adaptive engine takes over from these initial values.

---

## Estimated SAT Score from Ability

The gap dashboard shows an estimated SAT score range. This is a rough mapping — not a guarantee:

```typescript
function estimateSATScore(abilities: DomainAbilityMap): [number, number] {
  // Each domain contributes equally to the section score
  const mathDomains = ['Algebra', 'Advanced Math', 'PSDA', 'Geometry']
  const englishDomains = ['Craft & Structure', 'Information & Ideas', 'SEC', 'Expression']

  const mathAvg = average(mathDomains.map(d => abilities[d] ?? 500))
  const engAvg  = average(englishDomains.map(d => abilities[d] ?? 500))

  // Map 200-800 ability → 200-800 SAT section score
  // They're on the same scale by design
  const mathScore = Math.round(mathAvg / 10) * 10
  const engScore  = Math.round(engAvg / 10) * 10

  const total = mathScore + engScore
  // Return ±30 point range (±1 standard error)
  return [Math.max(400, total - 30), Math.min(1600, total + 30)]
}
```
