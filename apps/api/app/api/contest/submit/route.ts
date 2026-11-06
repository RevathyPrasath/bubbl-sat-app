import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient, createSupabaseUserClient } from '@/lib/supabase'

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { contestId?: string; answers?: Record<string, string>; timeTakenSecs?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { contestId, answers, timeTakenSecs } = body
  if (!contestId || !answers || timeTakenSecs == null) {
    return Response.json({ error: 'contestId, answers, and timeTakenSecs are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  // Fetch contest
  const { data: contest } = await admin
    .from('daily_contests')
    .select('id, question_ids, opens_at, closes_at')
    .eq('id', contestId)
    .single()

  if (!contest) {
    return Response.json({ error: 'Contest not found' }, { status: 404 })
  }

  const now = new Date()
  if (now < new Date(contest.opens_at)) {
    return Response.json({ error: 'Contest has not opened yet' }, { status: 400 })
  }
  if (now > new Date(contest.closes_at)) {
    return Response.json({ error: 'Contest has closed' }, { status: 400 })
  }

  // Check already submitted
  const { data: existing } = await supabase
    .from('contest_entries')
    .select('id')
    .eq('contest_id', contestId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: 'Already submitted' }, { status: 409 })
  }

  // Fetch questions and score
  const { data: questions } = await admin
    .from('questions')
    .select('id, correct')
    .in('id', contest.question_ids)

  let correctCount = 0
  for (const q of questions ?? []) {
    const userAnswer = answers[q.id]
    if (userAnswer && userAnswer.trim().toUpperCase() === q.correct.trim().toUpperCase()) {
      correctCount++
    }
  }

  // Insert entry
  const { error: insertError } = await supabase
    .from('contest_entries')
    .insert({
      contest_id: contestId,
      user_id: user.id,
      answers,
      correct_count: correctCount,
      time_taken_secs: timeTakenSecs,
    })

  if (insertError) {
    return Response.json({ error: 'Failed to submit entry' }, { status: 500 })
  }

  // Compute rank
  const { count: ahead } = await admin
    .from('contest_entries')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', contestId)
    .or(`correct_count.gt.${correctCount},and(correct_count.eq.${correctCount},time_taken_secs.lt.${timeTakenSecs})`)

  const rank = (ahead ?? 0) + 1

  const { count: total } = await admin
    .from('contest_entries')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', contestId)

  return Response.json({
    correctCount,
    totalQuestions: (contest.question_ids as string[]).length,
    timeTakenSecs,
    rank,
    totalEntrants: total ?? 1,
  })
}
