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

  const { data, error } = await supabase
    .from('attempts')
    .select('id, subject, total_questions, correct_count, score_pct, domain_results, time_taken_secs, abandoned, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: 'Failed to load session history' }, { status: 500 })
  }

  const sessions = (data ?? []).map(a => ({
    id: a.id,
    subject: a.subject,
    totalQuestions: a.total_questions,
    correctCount: a.correct_count,
    scorePct: a.score_pct,
    timeTakenSecs: a.time_taken_secs,
    abandoned: a.abandoned,
    createdAt: a.created_at,
    topDomain: a.domain_results
      ? Object.entries(a.domain_results as Record<string, { correct: number; total: number }>)
          .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))[0]?.[0] ?? null
      : null,
  }))

  return Response.json({ sessions })
}
