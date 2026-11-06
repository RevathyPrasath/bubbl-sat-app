import { createSupabaseAdminClient } from '@/lib/supabase'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const SEED_SECRET = process.env.SEED_SECRET ?? 'bubbl-dev-seed'

async function getStats() {
  const admin = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [users, papers, contests, entries, questions] = await Promise.all([
    admin.from('profiles').select('id, plan, created_at', { count: 'exact', head: false }),
    admin.from('papers').select('id, status, created_at').gte('created_at', weekAgo),
    admin.from('daily_contests').select('id, contest_date').order('contest_date', { ascending: false }).limit(7),
    admin.from('contest_entries').select('id, contest_id, correct_count').eq('contest_id',
      (await admin.from('daily_contests').select('id').eq('contest_date', today).maybeSingle()).data?.id ?? '00000000-0000-0000-0000-000000000000'
    ),
    admin.from('questions').select('id', { count: 'exact', head: true }),
  ])

  const premiumCount = (users.data ?? []).filter(u => u.plan === 'premium').length
  const completedPapers = (papers.data ?? []).filter(p => p.status === 'completed').length
  const avgCorrect = (entries.data ?? []).length > 0
    ? ((entries.data ?? []).reduce((s, e) => s + e.correct_count, 0) / (entries.data ?? []).length).toFixed(1)
    : '—'

  return {
    totalUsers: users.data?.length ?? 0,
    premiumUsers: premiumCount,
    freeUsers: (users.data?.length ?? 0) - premiumCount,
    papersThisWeek: papers.data?.length ?? 0,
    completedThisWeek: completedPapers,
    totalQuestions: questions.count ?? 0,
    recentContests: contests.data ?? [],
    todayEntrants: entries.data?.length ?? 0,
    todayAvgCorrect: avgCorrect,
  }
}

async function getPendingPosts() {
  try {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from('forum_posts')
      .select('id, title, topic, body, created_at, user_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    return data ?? []
  } catch {
    return []
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>
}) {
  const params = await searchParams
  const secret = params.secret

  if (secret !== SEED_SECRET) {
    return (
      <html>
        <body style={{ fontFamily: 'system-ui', padding: 40, background: '#0a0a0a', color: '#fff' }}>
          <h2>Bubbl Admin</h2>
          <p style={{ color: '#888' }}>Access requires <code>?secret=YOUR_SEED_SECRET</code></p>
          <form>
            <input name="secret" type="password" placeholder="Enter secret" style={{ padding: 8, borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#fff', marginRight: 8 }} />
            <button type="submit" style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Enter</button>
          </form>
        </body>
      </html>
    )
  }

  const [stats, pendingPosts] = await Promise.all([getStats(), getPendingPosts()])

  const s: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#0a0a0a',
    color: '#e5e5e5',
    minHeight: '100vh',
    padding: 32,
  }

  const card: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  }

  const stat: React.CSSProperties = {
    display: 'inline-block',
    background: '#252525',
    borderRadius: 10,
    padding: '14px 24px',
    margin: 6,
    textAlign: 'center',
    minWidth: 110,
  }

  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    background: color + '22',
    color,
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 700,
  })

  return (
    <html>
      <head><title>Bubbl Admin</title></head>
      <body style={s}>
        <h1 style={{ color: '#6366f1', marginBottom: 8 }}>🫧 Bubbl Admin</h1>
        <p style={{ color: '#666', marginBottom: 32 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Stats grid */}
        <div style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Overview</h2>
          <div>
            {[
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Premium', value: stats.premiumUsers, color: '#6366f1' },
              { label: 'Free', value: stats.freeUsers },
              { label: 'Papers This Week', value: stats.papersThisWeek },
              { label: 'Completed', value: stats.completedThisWeek },
              { label: 'Questions in DB', value: stats.totalQuestions },
              { label: "Today's Entrants", value: stats.todayEntrants },
              { label: 'Avg Correct Today', value: stats.todayAvgCorrect + '/10' },
            ].map(item => (
              <div key={item.label} style={{ ...stat }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: item.color ?? '#e5e5e5' }}>{item.value}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent contests */}
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Recent Contests (last 7 days)</h2>
          {stats.recentContests.length === 0
            ? <p style={{ color: '#666' }}>No contests yet</p>
            : stats.recentContests.map((c: any) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #2a2a2a', fontSize: 14 }}>
                📅 {c.contest_date}
              </div>
            ))
          }
        </div>

        {/* Pending forum posts */}
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>
            Pending Forum Posts
            <span style={{ ...badge('#FFC107'), marginLeft: 10 }}>{pendingPosts.length}</span>
          </h2>
          {pendingPosts.length === 0
            ? <p style={{ color: '#666' }}>No pending posts</p>
            : pendingPosts.map((post: any) => (
              <div key={post.id} style={{ background: '#252525', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{post.title}</strong>
                  <span style={badge('#6366f1')}>{post.topic}</span>
                </div>
                <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 10px' }}>{post.body.slice(0, 200)}{post.body.length > 200 ? '…' : ''}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <form action={`/api/admin/forum/${post.id}`} method="POST" style={{ display: 'inline' }}>
                    <input type="hidden" name="action" value="approve" />
                    <input type="hidden" name="secret" value={secret} />
                    <button style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Approve</button>
                  </form>
                  <form action={`/api/admin/forum/${post.id}`} method="POST" style={{ display: 'inline' }}>
                    <input type="hidden" name="action" value="reject" />
                    <input type="hidden" name="secret" value={secret} />
                    <button style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Reject</button>
                  </form>
                </div>
              </div>
            ))
          }
        </div>

        {/* Quick actions */}
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Test Contest', href: `/api/admin/test-contest`, headers: true },
              { label: 'Send Contest Notification', href: `/api/admin/send-contest-notification` },
            ].map(action => (
              <a key={action.label} href={action.href + `?secret=${secret}`}
                style={{ background: '#252525', border: '1px solid #333', borderRadius: 8, padding: '10px 18px', color: '#6366f1', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </body>
    </html>
  )
}
