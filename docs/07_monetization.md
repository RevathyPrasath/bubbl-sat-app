# 07 — Monetization

App: **Bubbl**

---

## Plan Comparison

| Feature | Free | Premium ($9.99/mo) |
|---------|------|-------------------|
| Papers per week | 2 | Unlimited |
| Subjects | Math or English (not both in one session) | Math + English combined |
| Gap dashboard | Top 3 gaps only | All 9 domains + trend charts |
| Attempt history | Last 3 only | Full history |
| Gap analysis report | After every 3 papers | After every 3 papers |
| PDF download | No | Yes |
| Ads | Banner + interstitial (1 each per paper) | None |
| Focus modes | Auto + 2 options | All modes |
| Question priority | Balanced | Newest questions first |

---

## Stripe Setup

### Products to Create in Stripe Dashboard

```
Product 1: Bubbl Premium Monthly
  Price: $9.99 / month (recurring)
  Price ID: save this as STRIPE_MONTHLY_PRICE_ID in env vars

Product 2: Bubbl Premium Annual
  Price: $79.99 / year (recurring)
  Price ID: save this as STRIPE_ANNUAL_PRICE_ID in env vars
  (saves $39.89 vs monthly = 33% discount)

Optional — Product 3: 7-Day Free Trial
  Add trial_period_days: 7 to the monthly price
  Students can cancel before day 7 and not be charged
```

### Stripe Configuration Checklist

```
□ Create Stripe account at stripe.com
□ Add business details (required for payouts)
□ Create products + prices as above
□ Get API keys:
    Publishable key  → EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY  (safe to bundle)
    Secret key       → STRIPE_SECRET_KEY                   (server only, never in app)
□ Set up webhook endpoint:
    URL: https://api.bubbl.app/api/webhook/stripe
    Events to listen for:
      customer.subscription.created
      customer.subscription.updated
      customer.subscription.deleted
      invoice.payment_failed
      invoice.payment_succeeded
□ Copy webhook signing secret → STRIPE_WEBHOOK_SECRET (server only)
□ Enable Apple Pay + Google Pay in Stripe Dashboard
    (students can pay with phone's native wallet)
□ Test with test card: 4242 4242 4242 4242
```

### Payment Flow in App

```typescript
// components/UpgradeSheet.tsx
import { useStripe } from '@stripe/stripe-react-native'

export function UpgradeSheet({ priceId }: { priceId: string }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  async function handleUpgrade() {
    // 1. Create checkout session on server
    const res = await fetch('/api/subscription/create-checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ priceId })
    })
    const { clientSecret } = await res.json()

    // 2. Init Stripe payment sheet
    await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Bubbl',
      applePay: { merchantCountryCode: 'US' },
      googlePay: { merchantCountryCode: 'US', testEnv: false },
      style: 'alwaysDark',
    })

    // 3. Present payment sheet — native Stripe UI
    const { error } = await presentPaymentSheet()
    if (!error) {
      // Stripe webhook will update plan in DB
      // Poll or listen for plan change
      await refreshSubscriptionStatus()
    }
  }

  return (
    <Button onPress={handleUpgrade}>
      Start Free Trial — $9.99/month after 7 days
    </Button>
  )
}
```

---

## AdMob Setup

### Account Setup

```
□ Create Google AdMob account at admob.google.com
□ Add app (iOS + Android separately — two app IDs)
□ Create ad units:
    iOS Banner     → save as ADMOB_IOS_BANNER_ID
    iOS Interstitial → save as ADMOB_IOS_INTERSTITIAL_ID
    Android Banner → save as ADMOB_ANDROID_BANNER_ID
    Android Interstitial → save as ADMOB_ANDROID_INTERSTITIAL_ID
□ Set ad content rating: Teen (appropriate for 13+)
□ Enable mediation (optional, increases fill rate):
    Add Meta Audience Network + AppLovin as mediation partners
```

### AdMob Integration in Expo

```typescript
// lib/admob.ts
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads'
import { Platform } from 'react-native'

const isDev = __DEV__

// Banner ad ID
export const BANNER_ID = isDev
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID!
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID!

// Interstitial ad ID
export const INTERSTITIAL_ID = isDev
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID!
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID!

// Preload interstitial at start of paper
export function createInterstitial() {
  const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
    keywords: ['education', 'SAT', 'college prep', 'students'],
  })
  interstitial.load()
  return interstitial
}
```

```typescript
// components/AdBanner.tsx
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import { useSubscription } from '../lib/hooks/useSubscription'
import { BANNER_ID } from '../lib/admob'

export function AdBanner() {
  const { isPremium } = useSubscription()
  if (isPremium) return null   // never show ads to premium users

  return (
    <BannerAd
      unitId={BANNER_ID}
      size={BannerAdSize.BANNER}
      requestOptions={{ keywords: ['education', 'SAT prep'] }}
    />
  )
}
```

```typescript
// In the paper session screen — show interstitial before results
async function completePaper() {
  await submitPaperToAPI()

  if (!isPremium && interstitialAd?.loaded) {
    await new Promise<void>(resolve => {
      interstitialAd.addAdEventListener(AdEventType.CLOSED, resolve)
      interstitialAd.show()
    })
  }

  router.push('/paper/results')
}
```

### AdMob Policy Rules (Important)

- Do NOT show ads to users under 13 (COPPA) — add age gate or COPPA flag
- Do NOT place ads where they obscure content or trigger accidental taps
- Do NOT reload ads more than once per 60 seconds
- Do NOT show interstitials during gameplay/active question — only between screens

---

## Free Tier Enforcement

```typescript
// /api/paper/route.ts — check before assembling paper
async function checkFreeLimit(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, papers_this_week, week_reset_at')
    .eq('id', userId)
    .single()

  // Reset weekly count if past reset time
  if (new Date(profile.week_reset_at) <= new Date()) {
    await supabase
      .from('profiles')
      .update({
        papers_this_week: 0,
        week_reset_at: nextMonday()
      })
      .eq('id', userId)
    return  // count was just reset, OK to proceed
  }

  if (profile.plan === 'free' && profile.papers_this_week >= 2) {
    throw new Response(
      JSON.stringify({
        error: 'weekly_limit_reached',
        message: 'Free plan: 2 papers per week. Upgrade for unlimited practice.',
        papersUsed: profile.papers_this_week,
        papersAllowed: 2,
        resetsAt: profile.week_reset_at
      }),
      { status: 403 }
    )
  }
}
```

---

## Revenue Projections

### Conservative (Month 6)

```
MAU: 5,000
  Free users:     4,750 (95%)
  Premium users:    250 (5% conversion)

Subscription revenue:
  250 × $9.99/month = $2,497/month

AdMob revenue:
  4,750 free users × 2 papers/week × 4 weeks = 38,000 papers/month
  38,000 papers × 2 ads/paper = 76,000 impressions
  eCPM $10 → 76,000 / 1,000 × $10 = $760/month

Total: ~$3,257/month
Stripe fees (2.9% + 30¢): ~$100/month
Net: ~$3,157/month
```

### Growth (Month 12)

```
MAU: 20,000
  Free users:     18,000 (90%)
  Premium users:   2,000 (10% conversion)

Subscription revenue:
  2,000 × $9.99/month = $19,980/month

AdMob revenue:
  18,000 free users × 3 papers/week × 4 weeks = 216,000 papers
  216,000 × 2 ads = 432,000 impressions
  eCPM $12 → $5,184/month

Total: ~$25,164/month
```

---

## User Acquisition Strategy (Zero Budget)

1. **Reddit** — r/SAT, r/ApplyingToCollege — share gap analysis reports
2. **TikTok/Instagram** — "I improved 150 points using this free app" format
3. **School counselors** — email outreach to 100 high school counselors with free premium codes
4. **Khan Academy forums** — position as the adaptive complement to KA
5. **College Board subreddit** — release gap analysis findings as content
6. **App Store optimization** — keywords: "SAT prep free", "digital SAT practice", "SAT adaptive"
