import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'dev-seed-secret-2024'

export async function GET(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  const { data: posts, error } = await admin
    .from('forum_posts')
    .select('id, topic, title, body, status, rejection_reason, ai_review, created_at, user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch pending posts', detail: error.message }, { status: 500 })
  }

  // Fetch author names from profiles separately
  const userIds = (posts ?? []).map(p => p.user_id)
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, name, plan').in('id', userIds)
    : { data: [] }
  const profileMap: Record<string, { name: string; plan: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = { name: p.name ?? 'Student', plan: p.plan ?? 'free' }

  const enriched = (posts ?? []).map(p => ({
    id: p.id,
    topic: p.topic,
    title: p.title,
    body: p.body,
    status: p.status,
    rejectionReason: p.rejection_reason,
    aiReview: p.ai_review,
    createdAt: p.created_at,
    authorName: profileMap[p.user_id]?.name ?? 'Student',
    authorPlan: profileMap[p.user_id]?.plan ?? 'free',
  }))

  return Response.json({ posts: enriched, total: enriched.length })
}
