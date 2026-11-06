import { requireAuth } from '@/lib/auth'
import { createSupabaseUserClient } from '@/lib/supabase'

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')
  const domain = searchParams.get('domain')

  if (!subject) {
    return Response.json({ error: 'subject is required' }, { status: 400 })
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  let query = supabase
    .from('questions')
    .select('skill')
    .eq('subject', subject)

  if (domain) {
    query = query.eq('domain', domain)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: 'Failed to load skills' }, { status: 500 })
  }

  const skills = [...new Set((data ?? []).map(r => r.skill).filter(Boolean))].sort()

  return Response.json({ skills })
}
