import { requireAuth } from '@/lib/auth'
import { createSupabaseClient } from '@/lib/supabase'

interface QuestionResult {
  questionId: string
  correct: boolean
  domain: string
  timeTakenSecs?: number
}

interface DomainResult {
  correct: number
  total: number
  avgTimeSecs: number | null
}

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: {
    paperId?: string
    questionResults?: QuestionResult[]
    timeTakenSecs?: number
    abandoned?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    paperId,
    questionResults,
    timeTakenSecs,
    abandoned = false,
  } = body

  if (!paperId) {
    return Response.json({ error: 'paperId is required' }, { status: 400 })
  }

  const supabase = createSupabaseClient()

  // Verify paper belongs to user
  const { data: paper, error: paperError } = await supabase
    .from('papers')
    .select('id, user_id, status, subject')
    .eq('id', paperId)
    .eq('user_id', user.id)
    .single()

  if (paperError || !paper) {
    return Response.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Use provided results or compute from seen_questions
  let results: QuestionResult[] = questionResults ?? []

  if (results.length === 0) {
    const { data: seenRows } = await supabase
      .from('seen_questions')
      .select('question_id, was_correct, time_taken_secs, questions(domain)')
      .eq('user_id', user.id)
      .eq('paper_id', paperId)

    results = (seenRows ?? []).map((row) => ({
      questionId: row.question_id,
      correct: row.was_correct,
      domain: (row.questions as unknown as { domain: string } | null)?.domain ?? 'Unknown',
      timeTakenSecs: row.time_taken_secs ?? undefined,
    }))
  }

  // Calculate per-domain results
  const domainMap: Record<string, { correct: number; total: number; times: number[] }> = {}

  for (const r of results) {
    if (!domainMap[r.domain]) {
      domainMap[r.domain] = { correct: 0, total: 0, times: [] }
    }
    domainMap[r.domain].total++
    if (r.correct) domainMap[r.domain].correct++
    if (r.timeTakenSecs != null) domainMap[r.domain].times.push(r.timeTakenSecs)
  }

  const domainResults: Record<string, DomainResult> = {}
  for (const [domain, stats] of Object.entries(domainMap)) {
    domainResults[domain] = {
      correct: stats.correct,
      total: stats.total,
      avgTimeSecs:
        stats.times.length > 0
          ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length)
          : null,
    }
  }

  const totalQuestions = results.length
  const correctCount = results.filter((r) => r.correct).length
  const scorePct =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  // Insert attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .insert({
      user_id: user.id,
      paper_id: paperId,
      subject: paper.subject,
      total_questions: totalQuestions,
      correct_count: correctCount,
      score_pct: scorePct,
      domain_results: domainResults,
      time_taken_secs: timeTakenSecs ?? null,
      abandoned,
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    return Response.json({ error: 'Failed to record attempt' }, { status: 500 })
  }

  // Mark paper as completed or abandoned
  await supabase
    .from('papers')
    .update({
      status: abandoned ? 'abandoned' : 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', paperId)

  // Update gap_profile
  const { data: gapProfile } = await supabase
    .from('gap_profile')
    .select('papers_since_update')
    .eq('user_id', user.id)
    .maybeSingle()

  const papersSinceUpdate = (gapProfile?.papers_since_update ?? 0) + 1

  await supabase
    .from('gap_profile')
    .upsert(
      { user_id: user.id, papers_since_update: papersSinceUpdate },
      { onConflict: 'user_id' }
    )

  const gapAnalysisReady = papersSinceUpdate >= 3
  const papersUntilGapAnalysis = gapAnalysisReady
    ? 0
    : 3 - papersSinceUpdate

  return Response.json({
    attemptId: attempt.id,
    scorePct,
    correctCount,
    totalQuestions,
    domainResults,
    gapAnalysisReady,
    papersUntilGapAnalysis,
  })
}
