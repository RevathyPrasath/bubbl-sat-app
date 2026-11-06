import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient, createSupabaseUserClient } from '@/lib/supabase'

// Contest opens at 10:00 AM UTC, closes at 11:59 PM UTC
const OPEN_HOUR_UTC = 10
const QUESTIONS_PER_CONTEST = 10

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function contestWindows(): { opens_at: string; closes_at: string } {
  const today = todayUTC()
  return {
    opens_at: `${today}T${String(OPEN_HOUR_UTC).padStart(2, '0')}:00:00Z`,
    closes_at: `${today}T23:59:59Z`,
  }
}

async function getOrCreateContest(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const today = todayUTC()

  // Try to fetch existing contest for today
  const { data: existing } = await admin
    .from('daily_contests')
    .select('id, contest_date, question_ids, opens_at, closes_at')
    .eq('contest_date', today)
    .maybeSingle()

  if (existing) return existing

  // Auto-create: pick 10 medium-difficulty questions spread across domains
  const { data: questions } = await admin
    .from('questions')
    .select('id, subject, domain')
    .gte('difficulty_rating', 350)
    .lte('difficulty_rating', 650)
    .order('times_seen', { ascending: true })
    .limit(60)

  if (!questions || questions.length < QUESTIONS_PER_CONTEST) return null

  // Pick balanced mix: 5 math + 5 english
  const math = questions.filter(q => q.subject === 'math')
  const eng = questions.filter(q => q.subject === 'english')
  const picked: string[] = []
  for (let i = 0; i < 5 && i < math.length; i++) picked.push(math[i].id)
  for (let i = 0; i < 5 && i < eng.length; i++) picked.push(eng[i].id)

  // Shuffle
  picked.sort(() => Math.random() - 0.5)

  const windows = contestWindows()
  const { data: created } = await admin
    .from('daily_contests')
    .insert({ contest_date: today, question_ids: picked, ...windows })
    .select('id, contest_date, question_ids, opens_at, closes_at')
    .single()

  return created
}

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const admin = createSupabaseAdminClient()
  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  const contest = await getOrCreateContest(admin)
  if (!contest) {
    return Response.json({ error: 'No contest available today' }, { status: 404 })
  }

  const now = new Date()
  const opensAt = new Date(contest.opens_at)
  const closesAt = new Date(contest.closes_at)
  const isOpen = now >= opensAt && now <= closesAt
  const secondsUntilOpen = isOpen ? 0 : Math.max(0, Math.round((opensAt.getTime() - now.getTime()) / 1000))

  // Check if user already submitted
  const { data: myEntry } = await supabase
    .from('contest_entries')
    .select('id, correct_count, time_taken_secs, submitted_at')
    .eq('contest_id', contest.id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch questions (strip correct answers if not yet submitted)
  const { data: questionRows } = await admin
    .from('questions')
    .select('id, subject, domain, skill, difficulty, stem, passage, choices, grid_in, correct, explanation, diagram_url')
    .in('id', contest.question_ids)

  const questionsOrdered = (contest.question_ids as string[]).map(qid =>
    (questionRows ?? []).find(q => q.id === qid)
  ).filter(Boolean)

  const questions = questionsOrdered.map((q: any, i: number) => ({
    id: q.id,
    number: i + 1,
    subject: q.subject,
    domain: q.domain,
    skill: q.skill,
    difficulty: q.difficulty,
    stem: q.stem,
    passage: q.passage ?? null,
    diagram_url: q.diagram_url ?? null,
    type: q.grid_in ? 'grid-in' : 'mcq',
    choices: q.choices ? Object.entries(q.choices as Record<string, string>).map(([key, text]) => ({ key, text })) : [],
    // Only reveal answer+explanation after user has submitted
    ...(myEntry ? { correct: q.correct, explanation: q.explanation } : {}),
  }))

  // Fetch leaderboard (top 20)
  const { data: leaderboard } = await admin
    .from('contest_entries')
    .select('user_id, correct_count, time_taken_secs, submitted_at')
    .eq('contest_id', contest.id)
    .order('correct_count', { ascending: false })
    .order('time_taken_secs', { ascending: true })
    .limit(20)

  // Fetch display names for leaderboard entries
  const lbUserIds = (leaderboard ?? []).map(e => e.user_id)
  const { data: profiles } = lbUserIds.length > 0
    ? await admin.from('profiles').select('id, name').in('id', lbUserIds)
    : { data: [] }

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p.name ?? 'Student'

  const lbWithRank = (leaderboard ?? []).map((e, i) => ({
    rank: i + 1,
    userId: e.user_id,
    name: profileMap[e.user_id] ?? 'Student',
    correctCount: e.correct_count,
    timeTakenSecs: e.time_taken_secs,
    isMe: e.user_id === user.id,
  }))

  // Find user's rank if not in top 20
  let myRank: number | null = null
  const myLbEntry = lbWithRank.find(e => e.isMe)
  if (myLbEntry) {
    myRank = myLbEntry.rank
  } else if (myEntry) {
    const { count } = await admin
      .from('contest_entries')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contest.id)
      .or(`correct_count.gt.${myEntry.correct_count},and(correct_count.eq.${myEntry.correct_count},time_taken_secs.lt.${myEntry.time_taken_secs})`)
    myRank = (count ?? 0) + 1
  }

  const totalEntrants = await admin
    .from('contest_entries')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', contest.id)

  return Response.json({
    contestId: contest.id,
    contestDate: contest.contest_date,
    opensAt: contest.opens_at,
    closesAt: contest.closes_at,
    isOpen,
    secondsUntilOpen,
    hasSubmitted: !!myEntry,
    myEntry: myEntry
      ? { correctCount: myEntry.correct_count, timeTakenSecs: myEntry.time_taken_secs, rank: myRank }
      : null,
    questions,
    leaderboard: lbWithRank,
    totalEntrants: totalEntrants.count ?? 0,
  })
}
