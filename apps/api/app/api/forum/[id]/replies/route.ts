import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { reviewForumContent } from '@/lib/forum-review'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const { id: postId } = await params
  const admin = createSupabaseAdminClient()

  // Verify the post exists and is approved
  const { data: post, error: postError } = await admin
    .from('forum_posts')
    .select('id')
    .eq('id', postId)
    .eq('status', 'approved')
    .single()

  if (postError || !post) {
    return Response.json({ error: 'Post not found' }, { status: 404 })
  }

  // Premium check
  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'premium') {
    return Response.json(
      { error: 'Replying in the forum requires a Premium subscription.' },
      { status: 403 }
    )
  }

  let body: { body?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { body: replyBody } = body

  if (!replyBody || replyBody.trim().length < 5) {
    return Response.json({ error: 'Reply body must be at least 5 characters' }, { status: 400 })
  }

  // Claude AI review
  const review = await reviewForumContent({ body: replyBody.trim() })
  const status = review.approved ? 'approved' : 'rejected'

  const { data: reply, error } = await admin
    .from('forum_replies')
    .insert({
      post_id: postId,
      user_id: user.id,
      body: replyBody.trim(),
      status,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Failed to create reply' }, { status: 500 })
  }

  return Response.json({ reply, review }, { status: 201 })
}
