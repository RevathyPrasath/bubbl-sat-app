import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'

function periodStart(period: string): string {
  const now = new Date()
  if (period === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
  if (period === 'monthly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }
  return '2000-01-01' // all-time
}

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'alltime'
  const startDate = periodStart(period)

  const admin = createSupabaseAdminClient()

  // Fetch all entries in period (joined with contest dates)
  const { data: contests } = await admin
    .from('daily_contests')
    .select('id')
    .gte('contest_date', startDate)

  if (!contests || contests.length === 0) {
    return Response.json({ rankings: [], period, totalContests: 0 })
  }

  const contestIds = contests.map(c => c.id)

  const { data: entries } = await admin
    .from('contest_entries')
    .select('user_id, contest_id, correct_count, time_taken_secs')
    .in('contest_id', contestIds)

  if (!entries || entries.length === 0) {
    return Response.json({ rankings: [], period, totalContests: contests.length })
  }

  // Per-contest: find winner (highest correct_count, lowest time for ties)
  const contestWinners: Record<string, string> = {}
  for (const contestId of contestIds) {
    const contestEntries = entries.filter(e => e.contest_id === contestId)
    if (contestEntries.length === 0) continue
    const winner = contestEntries.sort((a, b) =>
      b.correct_count - a.correct_count || a.time_taken_secs - b.time_taken_secs
    )[0]
    contestWinners[contestId] = winner.user_id
  }

  // Aggregate per user
  const userStats: Record<string, {
    totalCorrect: number
    contestsEntered: number
    wins: number
    bestScore: number
  }> = {}

  for (const e of entries) {
    if (!userStats[e.user_id]) {
      userStats[e.user_id] = { totalCorrect: 0, contestsEntered: 0, wins: 0, bestScore: 0 }
    }
    userStats[e.user_id].totalCorrect += e.correct_count
    userStats[e.user_id].contestsEntered++
    userStats[e.user_id].bestScore = Math.max(userStats[e.user_id].bestScore, e.correct_count)
    if (contestWinners[e.contest_id] === e.user_id) {
      userStats[e.user_id].wins++
    }
  }

  // Sort: wins desc, then totalCorrect desc
  const sorted = Object.entries(userStats)
    .sort(([, a], [, b]) => b.wins - a.wins || b.totalCorrect - a.totalCorrect)
    .slice(0, 25)

  // Fetch profile names
  const userIds = sorted.map(([uid]) => uid)
  const { data: profiles } = await admin.from('profiles').select('id, name').in('id', userIds)
  const nameMap: Record<string, string> = {}
  for (const p of profiles ?? []) nameMap[p.id] = p.name ?? 'Student'

  const rankings = sorted.map(([userId, stats], i) => ({
    rank: i + 1,
    userId,
    name: nameMap[userId] ?? 'Student',
    wins: stats.wins,
    totalCorrect: stats.totalCorrect,
    contestsEntered: stats.contestsEntered,
    bestScore: stats.bestScore,
    avgScore: +(stats.totalCorrect / stats.contestsEntered).toFixed(1),
    isMe: userId === user.id,
  }))

  // Find current user's rank if not in top 25
  let myRanking = rankings.find(r => r.isMe) ?? null
  if (!myRanking && userStats[user.id]) {
    const myStats = userStats[user.id]
    const myRank = Object.values(userStats).filter(s =>
      s.wins > myStats.wins || (s.wins === myStats.wins && s.totalCorrect > myStats.totalCorrect)
    ).length + 1
    myRanking = {
      rank: myRank,
      userId: user.id,
      name: nameMap[user.id] ?? 'Student',
      wins: myStats.wins,
      totalCorrect: myStats.totalCorrect,
      contestsEntered: myStats.contestsEntered,
      bestScore: myStats.bestScore,
      avgScore: +(myStats.totalCorrect / myStats.contestsEntered).toFixed(1),
      isMe: true,
    }
  }

  return Response.json({ rankings, myRanking, period, totalContests: contests.length })
}
