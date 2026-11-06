import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { reviewForumContent } from '@/lib/forum-review'

const ALLOWED_TOPICS = [
  'Algebra',
  'Advanced Math',
  'Data & Statistics',
  'Geometry & Trig',
  'Information & Ideas',
  'Craft & Structure',
  'Expression of Ideas',
  'Standard English',
] as const

const PAGE_SIZE = 20

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const { searchParams } = new URL(req.url)
  const topic = searchParams.get('topic')
  const page = parseInt(searchParams.get('page') ?? '0', 10)
  const offset = page * PAGE_SIZE

  const admin = createSupabaseAdminClient()

  // Count total matching approved posts
  let countQuery = admin
    .from('forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (topic) countQuery = countQuery.eq('topic', topic)

  const { count } = await countQuery

  const total = count ?? 0

  // Fetch page of posts
  let postsQuery = admin
    .from('forum_posts')
    .select('id, topic, title, body, created_at, approved_at, user_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (topic) postsQuery = postsQuery.eq('topic', topic)

  const { data: posts, error } = await postsQuery

  if (error) {
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  // Fetch author names
  const postUserIds = (posts ?? []).map(p => p.user_id)
  const { data: postProfiles } = postUserIds.length
    ? await admin.from('profiles').select('id, name').in('id', postUserIds)
    : { data: [] }
  const postProfileMap: Record<string, string> = {}
  for (const p of postProfiles ?? []) postProfileMap[p.id] = p.name ?? 'Student'

  // Get reply counts for each post
  const postIds = (posts ?? []).map(p => p.id)
  let replyCounts: Record<string, number> = {}

  if (postIds.length > 0) {
    const { data: repliesData } = await admin
      .from('forum_replies')
      .select('post_id')
      .in('post_id', postIds)
      .eq('status', 'approved')

    for (const r of repliesData ?? []) {
      replyCounts[r.post_id] = (replyCounts[r.post_id] ?? 0) + 1
    }
  }

  const enriched = (posts ?? []).map(p => ({
    id: p.id,
    topic: p.topic,
    title: p.title,
    body: p.body,
    createdAt: p.created_at,
    approvedAt: p.approved_at,
    authorName: postProfileMap[p.user_id] ?? 'Student',
    replyCount: replyCounts[p.id] ?? 0,
  }))

  return Response.json({ posts: enriched, total, hasMore: offset + enriched.length < total })
}

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const admin = createSupabaseAdminClient()

  // Premium check
  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'premium') {
    return Response.json(
      { error: 'Posting in the forum requires a Premium subscription.' },
      { status: 403 }
    )
  }

  let body: { topic?: string; title?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { topic, title, body: postBody } = body

  if (!topic || !title || !postBody) {
    return Response.json({ error: 'topic, title, and body are required' }, { status: 400 })
  }

  if (!(ALLOWED_TOPICS as readonly string[]).includes(topic)) {
    return Response.json(
      { error: `topic must be one of: ${ALLOWED_TOPICS.join(', ')}` },
      { status: 400 }
    )
  }

  if (title.trim().length < 5) {
    return Response.json({ error: 'title must be at least 5 characters' }, { status: 400 })
  }

  if (postBody.trim().length < 10) {
    return Response.json({ error: 'body must be at least 10 characters' }, { status: 400 })
  }

  // Claude AI review
  const review = await reviewForumContent({ title: title.trim(), body: postBody.trim() })
  const status = review.approved ? 'approved' : 'rejected'

  const { data: post, error } = await admin
    .from('forum_posts')
    .insert({
      user_id: user.id,
      topic,
      title: title.trim(),
      body: postBody.trim(),
      status,
      rejection_reason: review.approved ? null : review.reason,
      ai_review: review,
      approved_at: review.approved ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: 'Failed to create post' }, { status: 500 })
  }

  return Response.json({ post, review }, { status: 201 })
}
