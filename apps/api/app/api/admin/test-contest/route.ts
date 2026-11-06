import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'bubbl-dev-seed'

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  const today = todayUTC()

  // 1. Check daily_contests table accessible
  const { data: contests, error: ce } = await admin
    .from('daily_contests')
    .select('id, contest_date')
    .limit(5)

  if (ce) return Response.json({ step: 'daily_contests read', error: ce.message }, { status: 500 })

  // 2. Check contest_entries table accessible
  const { data: entries, error: ee } = await admin
    .from('contest_entries')
    .select('id')
    .limit(1)

  if (ee) return Response.json({ step: 'contest_entries read', error: ee.message }, { status: 500 })

  // 3. Auto-create today's contest if missing
  let todayContest = contests?.find(c => c.contest_date === today)
  if (!todayContest) {
    const now = new Date()
    const opensAt = `${today}T10:00:00Z`
    const closesAt = `${today}T23:59:59Z`

    const { data: qs } = await admin
      .from('questions')
      .select('id, subject')
      .gte('difficulty_rating', 350)
      .lte('difficulty_rating', 650)
      .limit(60)

    const math = (qs ?? []).filter(q => q.subject === 'math').slice(0, 5).map(q => q.id)
    const eng  = (qs ?? []).filter(q => q.subject === 'english').slice(0, 5).map(q => q.id)
    const ids  = [...math, ...eng].sort(() => Math.random() - 0.5)

    if (ids.length < 10) {
      return Response.json({ step: 'pick questions', error: `Only ${ids.length} questions found (need 10)`, math: math.length, eng: eng.length }, { status: 500 })
    }

    const { data: created, error: insertErr } = await admin
      .from('daily_contests')
      .insert({ contest_date: today, question_ids: ids, opens_at: opensAt, closes_at: closesAt })
      .select('id, contest_date')
      .single()

    if (insertErr) return Response.json({ step: 'create contest', error: insertErr.message }, { status: 500 })
    todayContest = created!
  }

  // 4. Fetch questions for today's contest
  const { data: fullContest } = await admin
    .from('daily_contests')
    .select('id, contest_date, question_ids, opens_at, closes_at')
    .eq('id', todayContest.id)
    .single()

  const { data: questions } = await admin
    .from('questions')
    .select('id, domain, subject, stem, difficulty')
    .in('id', (fullContest?.question_ids ?? []))

  return Response.json({
    ok: true,
    contestId: todayContest.id,
    contestDate: today,
    existingContests: contests?.length ?? 0,
    questionsLoaded: questions?.length ?? 0,
    questions: questions?.map(q => ({ id: q.id.slice(0,8), domain: q.domain, subject: q.subject, difficulty: q.difficulty })),
    opensAt: fullContest?.opens_at,
    closesAt: fullContest?.closes_at,
  })
}
