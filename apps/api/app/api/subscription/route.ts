import { requireAuth } from '@/lib/auth'
import { createSupabaseClient } from '@/lib/supabase'

export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const supabase = createSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_end_at')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan ?? 'free'
  const papersAllowedPerWeek = plan === 'premium' ? 999 : 5

  // Count papers created since the start of this ISO week (Monday 00:00)
  const now = new Date()
  const daysToMonday = (now.getDay() + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('papers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', weekStart.toISOString())
    .neq('status', 'abandoned')

  return Response.json({
    plan,
    subscriptionEndAt: profile?.subscription_end_at ?? null,
    papersUsedThisWeek: count ?? 0,
    papersAllowedPerWeek,
  })
}
