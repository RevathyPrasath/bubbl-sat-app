import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient } from '@/lib/supabase'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: string
}

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  const [seenResult, domainResult] = await Promise.all([
    supabase
      .from('seen_questions')
      .select('was_correct, answered_at, question_id')
      .eq('user_id', user.id)
      .order('answered_at', { ascending: true }),
    supabase
      .from('domain_ability')
      .select('domain, ability')
      .eq('user_id', user.id),
  ])

  const rows = seenResult.data ?? []
  const domains = domainResult.data ?? []

  const totalAnswered = rows.length
  const totalCorrect = rows.filter(r => r.was_correct).length
  const accuracyPct = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

  // Streak calculation
  const dates = [...new Set(rows.map(r => r.answered_at.slice(0, 10)))].sort()
  let bestStreak = 0, currentStreak = 0
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      currentStreak = 1
    } else {
      const diff = Math.round(
        (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400000
      )
      currentStreak = diff === 1 ? currentStreak + 1 : 1
    }
    bestStreak = Math.max(bestStreak, currentStreak)
  }

  // Per-domain accuracy
  const domainStats: Record<string, { correct: number; total: number }> = {}

  // Group seen questions by question_id to check domain
  // We'll use domain_ability as a proxy for domain proficiency
  const topDomainAbility = domains.length > 0
    ? Math.max(...domains.map(d => d.ability))
    : 0

  // Session-level accuracy: group by date to find perfect sessions
  const byDate: Record<string, { correct: number; total: number }> = {}
  for (const r of rows) {
    const d = r.answered_at.slice(0, 10)
    if (!byDate[d]) byDate[d] = { correct: 0, total: 0 }
    byDate[d].total++
    if (r.was_correct) byDate[d].correct++
  }
  const hasPerfectSession = Object.values(byDate).some(
    d => d.total >= 5 && d.correct === d.total
  )

  const firstAnsweredAt = rows[0]?.answered_at
  const hundredthAnsweredAt = rows[99]?.answered_at

  const achievements: Achievement[] = [
    {
      id: 'first_step',
      title: 'First Step',
      description: 'Answer your first question',
      icon: '🚀',
      earned: totalAnswered >= 1,
      earnedAt: totalAnswered >= 1 ? firstAnsweredAt : undefined,
    },
    {
      id: 'quick_learner',
      title: 'Quick Learner',
      description: 'Answer 10 questions correctly',
      icon: '⚡',
      earned: totalCorrect >= 10,
    },
    {
      id: 'century_club',
      title: 'Century Club',
      description: 'Answer 100 questions',
      icon: '💯',
      earned: totalAnswered >= 100,
      earnedAt: totalAnswered >= 100 ? hundredthAnsweredAt : undefined,
    },
    {
      id: 'sharp_shooter',
      title: 'Sharp Shooter',
      description: 'Reach 90%+ accuracy (min 20 questions)',
      icon: '🎯',
      earned: totalAnswered >= 20 && accuracyPct >= 90,
    },
    {
      id: 'week_warrior',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      earned: bestStreak >= 7,
    },
    {
      id: 'perfect_session',
      title: 'Perfect Session',
      description: 'Get 100% in a single day (min 5 questions)',
      icon: '⭐',
      earned: hasPerfectSession,
    },
    {
      id: 'domain_expert',
      title: 'Domain Expert',
      description: 'Reach 700+ ability in any domain',
      icon: '🏅',
      earned: topDomainAbility >= 700,
    },
    {
      id: 'grinder',
      title: 'Grinder',
      description: 'Answer 500 questions',
      icon: '💪',
      earned: totalAnswered >= 500,
    },
  ]

  const earnedCount = achievements.filter(a => a.earned).length

  return Response.json({ achievements, earnedCount, total: achievements.length })
}
