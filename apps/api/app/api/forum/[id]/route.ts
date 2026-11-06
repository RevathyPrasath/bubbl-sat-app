import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const { id } = await params
  const admin = createSupabaseAdminClient()

  // Fetch the approved post
  const { data: post, error: postError } = await admin
    .from('forum_posts')
    .select('id, topic, title, body, created_at, approved_at, user_id')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (postError || !post) {
    return Response.json({ error: 'Post not found' }, { status: 404 })
  }

  // Fetch approved replies for this post
  const { data: replies, error: repliesError } = await admin
    .from('forum_replies')
    .select('id, body, created_at, user_id')
    .eq('post_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (repliesError) {
    return Response.json({ error: 'Failed to fetch replies' }, { status: 500 })
  }

  // Fetch author names for post + replies
  const allUserIds = [post.user_id, ...(replies ?? []).map(r => r.user_id)]
  const { data: nameProfiles } = await admin.from('profiles').select('id, name').in('id', allUserIds)
  const nameMap: Record<string, string> = {}
  for (const p of nameProfiles ?? []) nameMap[p.id] = p.name ?? 'Student'

  return Response.json({
    post: {
      id: post.id,
      topic: post.topic,
      title: post.title,
      body: post.body,
      createdAt: post.created_at,
      approvedAt: post.approved_at,
      authorName: nameMap[post.user_id] ?? 'Student',
      replyCount: (replies ?? []).length,
    },
    replies: (replies ?? []).map(r => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      authorName: nameMap[r.user_id] ?? 'Student',
    })),
  })
}
