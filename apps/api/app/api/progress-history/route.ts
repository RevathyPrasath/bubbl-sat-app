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

  // Fetch all answers for this user over last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await supabase
    .from('seen_questions')
    .select('was_correct, answered_at')
    .eq('user_id', user.id)
    .gte('answered_at', since)
    .order('answered_at', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 })
  }

  // Group by date (YYYY-MM-DD)
  const byDay: Record<string, { total: number; correct: number }> = {}
  for (const r of rows ?? []) {
    const day = r.answered_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { total: 0, correct: 0 }
    byDay[day].total++
    if (r.was_correct) byDay[day].correct++
  }

  const days = Object.entries(byDay)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, { total, correct }]) => ({
      date,
      total,
      correct,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))

  // Streak calculation: consecutive days up to today
  const allDates = new Set(days.map(d => d.date))
  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (allDates.has(today) || allDates.has(yesterday)) {
    let cursor = allDates.has(today) ? new Date() : new Date(Date.now() - 86400000)
    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10)
      if (!allDates.has(dateStr)) break
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    }
  }

  return Response.json({ days, streak })
}
