import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient, createSupabaseAdminClient } from '@/lib/supabase'

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  // Get all wrong answers for this user, most recent first
  const { data: wrongRows, error } = await supabase
    .from('seen_questions')
    .select('question_id, answered_at')
    .eq('user_id', user.id)
    .eq('was_correct', false)
    .order('answered_at', { ascending: false })
    .limit(100)

  if (error) {
    return Response.json({ error: 'Failed to fetch notebook' }, { status: 500 })
  }

  if (!wrongRows || wrongRows.length === 0) {
    return Response.json({ entries: [] })
  }

  const ids = wrongRows.map(r => r.question_id)
  const answeredAtMap: Record<string, string> = {}
  for (const r of wrongRows) answeredAtMap[r.question_id] = r.answered_at

  // Fetch question details via admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()
  const { data: questions } = await admin
    .from('questions')
    .select('id, domain, skill, subject, stem, choices, grid_in, correct, explanation, diagram_url')
    .in('id', ids)

  if (!questions) return Response.json({ entries: [] })

  const entries = questions.map(q => ({
    id: q.id,
    domain: q.domain,
    skill: q.skill,
    subject: q.subject,
    stem: q.stem,
    correctAnswer: q.correct,
    explanation: q.explanation,
    diagram_url: q.diagram_url ?? null,
    type: q.grid_in ? 'grid-in' : 'mcq',
    choices: q.choices ? Object.entries(q.choices as Record<string, string>).map(([key, text]) => ({ key, text })) : [],
    answeredAt: answeredAtMap[q.id],
  }))

  // Sort by answeredAt desc (same order as wrongRows)
  entries.sort((a, b) => (b.answeredAt > a.answeredAt ? 1 : -1))

  // Group by domain
  const grouped: Record<string, typeof entries> = {}
  for (const e of entries) {
    if (!grouped[e.domain]) grouped[e.domain] = []
    grouped[e.domain].push(e)
  }

  return Response.json({ entries, grouped })
}
