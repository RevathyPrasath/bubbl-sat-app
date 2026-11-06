import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'

function scorePctToEstimated(pct: number): number {
  // Maps 0-100% accuracy to roughly 400-1600 SAT score
  return Math.round(400 + (pct / 100) * 1200)
}

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('attempts')
    .select('score_pct, subject, total_questions, correct_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return Response.json({ error: 'Failed to load score history' }, { status: 500 })
  }

  const attempts = data ?? []

  // Group by week (ISO week string)
  const byWeek: Record<string, { totalPct: number; count: number; label: string }> = {}

  for (const a of attempts) {
    const d = new Date(a.created_at)
    // Week key: year + week number
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (!byWeek[key]) byWeek[key] = { totalPct: 0, count: 0, label }
    byWeek[key].totalPct += a.score_pct
    byWeek[key].count++
  }

  const points = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { totalPct, count, label }]) => {
      const avgPct = totalPct / count
      return {
        week: key,
        label,
        avgPct: Math.round(avgPct),
        estimatedScore: scorePctToEstimated(avgPct),
      }
    })

  // Running cumulative: smooth the score over time
  const smoothed = points.map((p, i) => {
    const window = points.slice(Math.max(0, i - 2), i + 1)
    const avg = window.reduce((s, w) => s + w.estimatedScore, 0) / window.length
    return { ...p, smoothedScore: Math.round(avg) }
  })

  return Response.json({ points: smoothed })
}
