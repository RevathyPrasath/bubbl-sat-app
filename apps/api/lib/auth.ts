import { createSupabaseClient } from './supabase'

export async function requireAuth(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = createSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { id: user.id, email: user.email! }
}
