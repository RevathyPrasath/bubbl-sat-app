import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { token?: string; platform?: string }
  try { body = await req.json() } catch { body = {} }

  const { token, platform } = body
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  await admin.from('push_tokens').upsert(
    { user_id: user.id, token, platform: platform ?? 'unknown', updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' }
  )

  return Response.json({ ok: true })
}
