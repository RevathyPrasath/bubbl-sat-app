import { requireAuth } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { plan?: 'monthly' | 'annual'; successUrl?: string; cancelUrl?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const plan = body.plan ?? 'monthly'
  const priceId = plan === 'annual'
    ? process.env.STRIPE_ANNUAL_PRICE_ID!
    : process.env.STRIPE_MONTHLY_PRICE_ID!

  const origin = req.headers.get('origin') ?? 'http://localhost:8081'
  const successUrl = body.successUrl ?? `${origin}/(app)/home?upgrade=success`
  const cancelUrl = body.cancelUrl ?? `${origin}/(app)/paywall`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: user.email,
    metadata: { userId: user.id },
  })

  return Response.json({ url: session.url })
}
