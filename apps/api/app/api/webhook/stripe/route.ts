import Stripe from 'stripe'
import { createSupabaseClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createSupabaseClient()

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        stripe_subscription_id: subscription.id,
        subscription_end_at: new Date(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (subscription as any).current_period_end * 1000
        ).toISOString(),
      })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await supabase
      .from('profiles')
      .update({
        plan: 'free',
        stripe_subscription_id: null,
        subscription_end_at: null,
      })
      .eq('stripe_customer_id', customerId)
  }

  return Response.json({ received: true })
}
