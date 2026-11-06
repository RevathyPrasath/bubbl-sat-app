import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'dev-seed-secret-2024'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const admin = createSupabaseAdminClient()

  let body: { action?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, reason } = body

  if (action !== 'approve' && action !== 'reject') {
    return Response.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  if (action === 'reject' && !reason) {
    return Response.json({ error: 'reason is required when rejecting a post' }, { status: 400 })
  }

  const update =
    action === 'approve'
      ? { status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null }
      : { status: 'rejected', rejection_reason: reason ?? null, approved_at: null }

  const { data: post, error } = await admin
    .from('forum_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !post) {
    return Response.json({ error: 'Post not found or update failed' }, { status: 404 })
  }

  return Response.json({ post })
}
