import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient, createSupabaseAdminClient } from '@/lib/supabase'
import {
  getDomainWeights,
  getRatingBand,
  sampleByDifficulty,
} from '@/lib/adaptive'

const SHOW_SEEN = process.env.FEATURE_SHOW_SEEN === 'true'

interface QuestionRow {
  id: string
  subject: string
  domain: string
  skill: string
  cb_skill_code: string
  difficulty: string
  difficulty_rating: number
  passage: string | null
  stem: string
  choices: Record<string, string> | null
  grid_in: boolean
  correct: string
  explanation: string
  diagram_url?: string | null
  times_seen: number
  times_correct: number
}

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { subject?: string; focus?: string; domain?: string; skill?: string; questionCount?: number; diagnostic?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const isDiagnostic = body.diagnostic === true
  const { subject: rawSubject, questionCount } = body
  const focus = body.focus ?? body.domain ?? null
  const skillFilter = body.skill ?? null

  // Diagnostic mode: fetch a balanced mix of math + english, skip subject validation
  if (isDiagnostic) {
    return handleDiagnostic(user, req)
  }

  const subject = rawSubject
  if (!subject || (subject !== 'math' && subject !== 'english')) {
    return Response.json(
      { error: 'subject must be "math" or "english"' },
      { status: 400 }
    )
  }

  const totalQuestions = questionCount ?? (subject === 'math' ? 22 : 27)

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  // Check paper limit — upsert profile if it doesn't exist yet
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({ id: user.id, name: user.email?.split('@')[0] ?? '' })
      .select('plan')
      .single()

    if (createError || !created) {
      return Response.json({ error: 'Failed to create profile' }, { status: 500 })
    }
    profile = created
  }

  if (profile.plan === 'free') {
    // Count non-abandoned papers created since the start of this ISO week (Monday 00:00)
    const now = new Date()
    const daysToMonday = (now.getDay() + 6) % 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const { count: papersThisWeek } = await supabase
      .from('papers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .neq('status', 'abandoned')

    if ((papersThisWeek ?? 0) >= 5) {
      return Response.json(
        { error: 'Free plan limit reached. Upgrade to premium for unlimited papers.' },
        { status: 403 }
      )
    }
  }

  // Get domain ability scores for this user
  const { data: domainAbilities, error: abilityError } = await supabase
    .from('domain_ability')
    .select('domain, ability')
    .eq('user_id', user.id)

  if (abilityError) {
    return Response.json({ error: 'Failed to load ability data' }, { status: 500 })
  }

  // Build abilityMap with defaults of 500
  const mathDomains = ['Algebra', 'Advanced Math', 'PSDA', 'Geometry']
  const englishDomains = [
    'Craft & Structure',
    'Information & Ideas',
    'SEC',
    'Expression',
  ]
  const subjectDomains = subject === 'math' ? mathDomains : englishDomains

  const abilityMap: Record<string, number> = {}
  for (const domain of subjectDomains) {
    abilityMap[domain] = 500
  }
  for (const row of domainAbilities ?? []) {
    if (row.domain in abilityMap) {
      abilityMap[row.domain] = row.ability
    }
  }

  // Get seen question IDs for this user
  const { data: seenRows } = await supabase
    .from('seen_questions')
    .select('question_id, was_correct, answered_at')
    .eq('user_id', user.id)

  const seenIds: string[] = seenRows?.map((r) => r.question_id) ?? []

  // Spaced repetition: pick up to 3 questions the user got wrong > 24h ago for review
  const reviewCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const reviewIds = (seenRows ?? [])
    .filter(r => !r.was_correct && r.answered_at < reviewCutoff)
    .slice(0, 3)
    .map(r => r.question_id)

  let reviewQuestions: QuestionRow[] = []
  if (reviewIds.length > 0) {
    const admin = createSupabaseAdminClient()
    const { data: rqs } = await admin
      .from('questions')
      .select('id, subject, domain, skill, cb_skill_code, difficulty, difficulty_rating, passage, stem, choices, grid_in, correct, explanation, diagram_url, times_seen, times_correct')
      .in('id', reviewIds)
    reviewQuestions = (rqs ?? []) as QuestionRow[]
  }

  // Get domain weights (number of questions per domain)
  const mainCount = Math.max(1, totalQuestions - reviewQuestions.length)
  const domainWeights = getDomainWeights(subject, focus, abilityMap)
  // Scale weights down proportionally to leave room for review questions
  const weightTotal = Object.values(domainWeights).reduce((s, v) => s + v, 0)
  const scaledWeights: Record<string, number> = {}
  for (const [d, w] of Object.entries(domainWeights)) {
    scaledWeights[d] = Math.max(0, Math.round((w / weightTotal) * mainCount))
  }

  // Fetch questions for each domain
  const allSelected: QuestionRow[] = []
  const selectedIds = new Set<string>()

  async function fetchForDomain(domain: string, count: number): Promise<QuestionRow[]> {
    const ability = abilityMap[domain] ?? 500
    const [bandLow, bandHigh] = getRatingBand(ability)

    const buildQuery = (wideBand: boolean) => {
      let q = supabase
        .from('questions')
        .select('id, subject, domain, skill, cb_skill_code, difficulty, difficulty_rating, passage, stem, choices, grid_in, correct, explanation, diagram_url, times_seen, times_correct')
        .eq('subject', subject)
        .eq('domain', domain)
        .order('times_seen', { ascending: true })
        .limit(count * 4)

      if (!wideBand) {
        q = q.gte('difficulty_rating', bandLow).lte('difficulty_rating', bandHigh)
      }
      if (skillFilter) q = q.eq('skill', skillFilter)
      if (!SHOW_SEEN && seenIds.length > 0) {
        q = q.not('id', 'in', `(${seenIds.join(',')})`)
      }
      return q
    }

    // Try narrow band first
    let { data: questions, error } = await buildQuery(false)
    if (error) return []

    // If not enough, widen to full domain
    if (!questions || questions.length < count) {
      const { data: wider } = await buildQuery(true)
      questions = wider ?? questions ?? []
    }

    // Deduplicate across domains
    const fresh = (questions as QuestionRow[]).filter(q => !selectedIds.has(q.id))
    return sampleByDifficulty(fresh, count)
  }

  for (const [domain, count] of Object.entries(scaledWeights)) {
    if (count <= 0) continue
    const picked = await fetchForDomain(domain, count)
    for (const q of picked) selectedIds.add(q.id)
    allSelected.push(...picked)
  }

  if (allSelected.length === 0 && reviewQuestions.length === 0) {
    return Response.json(
      { error: 'Not enough questions available for this selection' },
      { status: 404 }
    )
  }

  // Merge review questions into the pool
  const combined = [...reviewQuestions, ...allSelected]

  // Shuffle
  const shuffled = combined.sort(() => Math.random() - 0.5)

  // Insert paper record
  const { data: paper, error: paperError } = await supabase
    .from('papers')
    .insert({
      user_id: user.id,
      subject,
      focus: focus ?? null,
      status: 'in_progress',
      question_ids: shuffled.map((q) => q.id),
      question_count: shuffled.length,
    })
    .select('id')
    .single()

  if (paperError || !paper) {
    return Response.json({ error: 'Failed to create paper' }, { status: 500 })
  }

  // Strip correct answers and format for client
  const reviewIdSet = new Set(reviewIds)
  const questions = shuffled.map((q, index) => ({
    id: q.id,
    number: index + 1,
    subject: q.subject,
    domain: q.domain,
    skill: q.skill,
    cb_skill_code: q.cb_skill_code,
    difficulty: q.difficulty,
    difficulty_rating: q.difficulty_rating,
    passage: q.passage,
    stem: q.stem,
    diagram_url: q.diagram_url ?? null,
    type: q.grid_in ? 'grid-in' : 'mcq',
    isReview: reviewIdSet.has(q.id),
    choices: q.choices
      ? Object.entries(q.choices).map(([key, text]) => ({ key, text }))
      : [],
  }))

  return Response.json({
    paperId: paper.id,
    subject,
    focus: focus ?? null,
    questions,
  })
}

// ── Diagnostic: 5 math + 5 english, medium difficulty, no seen-question filter ──
async function handleDiagnostic(user: { id: string; email: string }, req: Request) {
  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)
  const admin = createSupabaseAdminClient()

  const fetchSubject = async (subject: 'math' | 'english', count: number): Promise<QuestionRow[]> => {
    const { data } = await admin
      .from('questions')
      .select('id, subject, domain, skill, cb_skill_code, difficulty, difficulty_rating, passage, stem, choices, grid_in, correct, explanation, diagram_url, times_seen, times_correct')
      .eq('subject', subject)
      .gte('difficulty_rating', 400)
      .lte('difficulty_rating', 600)
      .order('times_seen', { ascending: true })
      .limit(count * 3)
    return sampleByDifficulty((data ?? []) as QuestionRow[], count)
  }

  const [mathQs, engQs] = await Promise.all([
    fetchSubject('math', 5),
    fetchSubject('english', 5),
  ])

  const combined: QuestionRow[] = []
  for (let i = 0; i < 5; i++) {
    if (mathQs[i]) combined.push(mathQs[i])
    if (engQs[i]) combined.push(engQs[i])
  }

  if (combined.length === 0) {
    return Response.json({ error: 'No diagnostic questions available' }, { status: 404 })
  }

  const { data: paper, error: paperError } = await supabase
    .from('papers')
    .insert({
      user_id: user.id,
      subject: 'math',
      focus: null,
      status: 'in_progress',
      question_ids: combined.map(q => q.id),
      question_count: combined.length,
    })
    .select('id')
    .single()

  if (paperError || !paper) {
    return Response.json({ error: 'Failed to create diagnostic paper' }, { status: 500 })
  }

  const questions = combined.map((q, index) => ({
    id: q.id,
    number: index + 1,
    subject: q.subject,
    domain: q.domain,
    skill: q.skill,
    cb_skill_code: q.cb_skill_code,
    difficulty: q.difficulty,
    difficulty_rating: q.difficulty_rating,
    passage: q.passage,
    stem: q.stem,
    diagram_url: q.diagram_url ?? null,
    type: q.grid_in ? 'grid-in' : 'mcq',
    isReview: false,
    choices: q.choices
      ? Object.entries(q.choices).map(([key, text]) => ({ key, text }))
      : [],
  }))

  return Response.json({ paperId: paper.id, subject: 'mixed', focus: null, questions })
}
