import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'bubbl-dev-seed'
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function POST(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  // Fetch all registered push tokens
  const { data: tokens } = await admin
    .from('push_tokens')
    .select('token')

  if (!tokens || tokens.length === 0) {
    return Response.json({ ok: true, sent: 0, message: 'No tokens registered' })
  }

  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    title: "Today's SAT Challenge is Live! 🏆",
    body: "10 questions. Same for everyone. Who's fastest today?",
    data: { screen: 'contest' },
  }))

  // Expo Push API accepts up to 100 messages per request
  const chunks: typeof messages[] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  let sent = 0
  const errors: string[] = []

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      const data = await res.json() as { data?: Array<{ status: string; message?: string }> }
      const chunkSent = (data.data ?? []).filter(r => r.status === 'ok').length
      sent += chunkSent
      const chunkErrors = (data.data ?? []).filter(r => r.status !== 'ok').map(r => r.message ?? 'unknown')
      errors.push(...chunkErrors)
    } catch (e) {
      errors.push(String(e))
    }
  }

  return Response.json({ ok: true, sent, total: tokens.length, errors: errors.slice(0, 10) })
}
