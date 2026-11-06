import { createSupabaseAdminClient } from '@/lib/supabase'

export async function PATCH(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (!secret || secret !== process.env.SEED_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id: string; diagram_url?: string | null; [key: string]: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, ...fields } = body
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('questions')
    .update(fields)
    .eq('id', id)
    .select('id, stem, diagram_url')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ updated: data })
}
