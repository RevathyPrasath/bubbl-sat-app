import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient } from '@/lib/supabase'

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  const [seenResult, abilityResult, profileResult] = await Promise.all([
    supabase
      .from('seen_questions')
      .select('was_correct, answered_at')
      .eq('user_id', user.id)
      .order('answered_at', { ascending: true }),
    supabase
      .from('domain_ability')
      .select('domain, ability')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('plan, papers_this_week, name')
      .eq('id', user.id)
      .single(),
  ])

  const rows = seenResult.data ?? []
  const totalAnswered = rows.length
  const totalCorrect = rows.filter(r => r.was_correct).length
  const accuracyPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const xp = totalCorrect * 10
  const level = Math.floor(xp / 200) + 1
  const xpInLevel = xp % 200
  const xpToNextLevel = 200

  // Best streak calculation
  const dates = [...new Set(rows.map(r => r.answered_at.slice(0, 10)))].sort()
  let bestStreak = 0
  let currentStreak = 0
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      if (diffDays === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak)
  }

  const domains = abilityResult.data ?? []
  const strongestDomain = domains.length > 0
    ? domains.reduce((a, b) => a.ability > b.ability ? a : b).domain
    : null
  const weakestDomain = domains.length > 0
    ? domains.reduce((a, b) => a.ability < b.ability ? a : b).domain
    : null

  return Response.json({
    totalAnswered,
    totalCorrect,
    accuracyPct,
    xp,
    level,
    xpInLevel,
    xpToNextLevel,
    bestStreak,
    strongestDomain,
    weakestDomain,
    plan: profileResult.data?.plan ?? 'free',
    name: profileResult.data?.name ?? '',
  })
}
