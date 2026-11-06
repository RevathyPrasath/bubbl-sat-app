import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { questionId?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { questionId, reason } = body
  if (!questionId) {
    return Response.json({ error: 'questionId is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Best-effort insert — silently ignore DB errors (table may not exist in all envs)
  await admin.from('question_reports').insert({
    question_id: questionId,
    user_id: user.id,
    reason: reason ?? 'No reason provided',
    reported_at: new Date().toISOString(),
  })

  return Response.json({ success: true })
}
