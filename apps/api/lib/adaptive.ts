export function updateAbility(
  current: number,
  qRating: number,
  correct: boolean
): number {
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

export function abilityLabel(ability: number): string {
  if (ability < 350) return 'Building'
  if (ability < 500) return 'Developing'
  if (ability < 575) return 'Solid'
  if (ability < 650) return 'Strong'
  if (ability < 725) return 'Advanced'
  return 'Expert'
}

export function abilityToTargetRating(ability: number): number {
  if (ability < 350) return 300
  if (ability < 575) return 500
  if (ability < 725) return 650
  return 800
}

export function getRatingBand(ability: number): [number, number] {
  const target = abilityToTargetRating(ability)
  const lower = target === 300 ? 300 : target - 150
  const upper = target === 800 ? 800 : target + 150
  return [lower, upper]
}

export function autoWeightByAbility(
  abilityMap: Record<string, number>,
  baseWeights: Record<string, number>,
  totalQuestions: number
): Record<string, number> {
  const gapBoost: Record<string, number> = {}
  for (const [domain, ability] of Object.entries(abilityMap)) {
    gapBoost[domain] = 1 + (500 - ability) / 1000
  }

  const rawWeights = Object.entries(baseWeights).map(([domain, w]) => ({
    domain,
    weight: w * (gapBoost[domain] ?? 1),
  }))

  const totalWeight = rawWeights.reduce((s, x) => s + x.weight, 0)

  return Object.fromEntries(
    rawWeights.map(({ domain, weight }) => [
      domain,
      Math.max(2, Math.round((weight / totalWeight) * totalQuestions)),
    ])
  )
}

export function getDomainWeights(
  subject: string,
  focus: string | undefined | null,
  abilityMap: Record<string, number>
): Record<string, number> {
  if (subject === 'math') {
    if (focus === 'psda')
      return { PSDA: 14, Algebra: 3, 'Advanced Math': 3, Geometry: 2 }
    if (focus === 'geometry')
      return { Geometry: 12, 'Advanced Math': 4, Algebra: 4, PSDA: 2 }
    if (focus === 'algebra')
      return { Algebra: 14, 'Advanced Math': 4, PSDA: 2, Geometry: 2 }
    return autoWeightByAbility(
      abilityMap,
      { Algebra: 0.3, 'Advanced Math': 0.3, PSDA: 0.2, Geometry: 0.2 },
      22
    )
  }
  if (subject === 'english') {
    if (focus === 'vocab')
      return {
        'Craft & Structure': 16,
        'Information & Ideas': 4,
        SEC: 4,
        Expression: 3,
      }
    if (focus === 'sec')
      return {
        SEC: 14,
        'Craft & Structure': 4,
        Expression: 5,
        'Information & Ideas': 4,
      }
    if (focus === 'synthesis')
      return {
        Expression: 14,
        'Craft & Structure': 4,
        'Information & Ideas': 5,
        SEC: 4,
      }
    return autoWeightByAbility(
      abilityMap,
      {
        'Craft & Structure': 0.3,
        'Information & Ideas': 0.3,
        SEC: 0.25,
        Expression: 0.15,
      },
      27
    )
  }
  // Default fallback
  return autoWeightByAbility(abilityMap, { Default: 1.0 }, 22)
}

interface QuestionWithDifficulty {
  difficulty_rating: number
}

export function sampleByDifficulty<T extends QuestionWithDifficulty>(
  questions: T[],
  count: number
): T[] {
  const targets: Record<number, number> = {
    300: Math.round(count * 0.25),
    500: Math.round(count * 0.45),
    650: Math.round(count * 0.25),
    800: Math.max(1, Math.round(count * 0.05)),
  }

  const byDifficulty: Record<number, T[]> = {
    300: questions.filter((q) => q.difficulty_rating === 300),
    500: questions.filter((q) => q.difficulty_rating === 500),
    650: questions.filter((q) => q.difficulty_rating === 650),
    800: questions.filter((q) => q.difficulty_rating === 800),
  }

  const selected: T[] = []
  for (const [rating, target] of Object.entries(targets)) {
    const pool = byDifficulty[Number(rating)] ?? []
    selected.push(...pool.slice(0, target))
  }

  return selected
}
