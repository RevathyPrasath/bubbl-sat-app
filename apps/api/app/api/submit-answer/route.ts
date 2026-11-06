import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient } from '@/lib/supabase'
import { updateAbility, abilityLabel } from '@/lib/adaptive'

const SHOW_SEEN = process.env.FEATURE_SHOW_SEEN === 'true'

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: {
    paperId?: string
    questionId?: string
    answer?: string
    timeTakenSecs?: number
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { paperId, questionId, answer } = body

  if (!paperId || !questionId || answer === undefined || answer === null) {
    return Response.json(
      { error: 'paperId, questionId, and answer are required' },
      { status: 400 }
    )
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  // Verify paper belongs to user and is in_progress
  const { data: paper, error: paperError } = await supabase
    .from('papers')
    .select('id, user_id, status')
    .eq('id', paperId)
    .eq('user_id', user.id)
    .single()

  if (paperError || !paper) {
    return Response.json({ error: 'Paper not found' }, { status: 404 })
  }

  if (paper.status !== 'in_progress') {
    return Response.json({ error: 'Paper is not in progress' }, { status: 409 })
  }

  // Check if already answered this question for this user
  if (!SHOW_SEEN) {
    const { data: existing } = await supabase
      .from('seen_questions')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle()

    if (existing) {
      return Response.json(
        { error: 'This question was already answered' },
        { status: 409 }
      )
    }
  }

  // Fetch question
  const { data: question, error: qError } = await supabase
    .from('questions')
    .select(
      'id, correct, explanation, trap_choice, strategy, difficulty_rating, domain, times_seen, times_correct'
    )
    .eq('id', questionId)
    .single()

  if (qError || !question) {
    return Response.json({ error: 'Question not found' }, { status: 404 })
  }

  const isCorrect = answer.trim().toUpperCase() === question.correct.trim().toUpperCase()

  // Get current domain ability
  const { data: abilityRow } = await supabase
    .from('domain_ability')
    .select('ability')
    .eq('user_id', user.id)
    .eq('domain', question.domain)
    .maybeSingle()

  const oldAbility = abilityRow?.ability ?? 500
  const newAbility = updateAbility(oldAbility, question.difficulty_rating, isCorrect)

  // Update domain_ability
  await supabase.from('domain_ability').upsert(
    {
      user_id: user.id,
      domain: question.domain,
      ability: newAbility,
    },
    { onConflict: 'user_id,domain' }
  )

  // Record seen question (upsert to handle re-attempts when FEATURE_SHOW_SEEN=true)
  await supabase.from('seen_questions').upsert(
    { user_id: user.id, question_id: questionId, was_correct: isCorrect },
    { onConflict: 'user_id,question_id' }
  )

  // Update question stats
  await supabase
    .from('questions')
    .update({
      times_seen: (question.times_seen ?? 0) + 1,
      times_correct: isCorrect
        ? (question.times_correct ?? 0) + 1
        : question.times_correct ?? 0,
    })
    .eq('id', questionId)

  return Response.json({
    correct: isCorrect,
    correctAnswer: question.correct,
    explanation: question.explanation,
    oldAbility,
    newAbility,
    abilityLabel: abilityLabel(newAbility),
    trapChoice: question.trap_choice ?? null,
    strategy: question.strategy ?? null,
  })
}
