# 09 — Deployment

App: **Bubbl**

---

## Overview

```
Step 1: Supabase — database + auth (do this first)
Step 2: Vercel — backend API
Step 3: Stripe — payments
Step 4: AdMob — ads
Step 5: Expo EAS — mobile builds
Step 6: App Store + Play Store submission
```

---

## Step 1 — Supabase Setup

### 1.1 Create Project

```
1. Go to supabase.com → New Project
2. Project name: bubbl-production
3. Database password: generate strong password, save it
4. Region: US East (or closest to your users)
5. Wait ~2 minutes for provisioning
```

### 1.2 Run Migrations

```
1. Go to Supabase Dashboard → SQL Editor
2. Paste entire contents of schema/migrations/001_initial.sql
3. Click Run
4. Verify in Table Editor: all 7 tables created
5. Verify in Auth → Triggers: on_auth_user_created exists
```

### 1.3 Configure Auth Providers

**Email/Password:**
```
Dashboard → Authentication → Providers → Email
✓ Enable Email provider
✓ Confirm email: OFF for now (simplifies testing)
```

**Google OAuth:**
```
1. Go to console.cloud.google.com
2. Create project: "Bubbl"
3. APIs & Services → Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs:
     https://<your-project-ref>.supabase.co/auth/v1/callback
6. Copy Client ID and Client Secret
7. Dashboard → Authentication → Providers → Google
8. Paste Client ID and Secret → Save
```

**Apple Sign In:**
```
1. Go to developer.apple.com
2. Certificates, IDs & Profiles → Identifiers → Add (Services ID)
3. Description: Bubbl Sign In
4. Identifier: com.bubbl.app.signin
5. Configure → Sign In with Apple → Add domain:
     <your-project-ref>.supabase.co
6. Return URL: https://<your-project-ref>.supabase.co/auth/v1/callback
7. Create Key → Sign In with Apple → Download .p8 file
8. Dashboard → Authentication → Providers → Apple
9. Paste: Services ID, Team ID, Key ID, Private Key (.p8 contents)
```

### 1.4 Get API Keys

```
Dashboard → Settings → API:
  Project URL  → SUPABASE_URL
  anon key     → EXPO_PUBLIC_SUPABASE_ANON_KEY
  service_role → SUPABASE_SERVICE_KEY  (keep secret, server only)
```

### 1.5 Seed Question Bank

```bash
# Install Python dependencies
pip install supabase

# Run seeder for each batch
python3 schema/seed/seed.py --file schema/seed/math_psda.json
python3 schema/seed/seed.py --file schema/seed/math_algebra.json
# ... repeat for all 8 batch files
```

### 1.6 Enable pg_cron

```
Dashboard → Database → Extensions → Search "pg_cron" → Enable
Then run in SQL Editor:

-- Weekly paper reset (every Monday 00:00 UTC)
select cron.schedule(
  'reset-weekly-papers',
  '0 0 * * 1',
  $$ select public.reset_weekly_papers(); $$
);

-- Nightly question calibration (2am UTC)
select cron.schedule(
  'recalibrate-questions',
  '0 2 * * *',
  $$ select public.recalibrate_questions(); $$
);
```

---

## Step 2 — Vercel Setup

### 2.1 Prepare Repository

```bash
# Initialize git if not done
git init
git add .
git commit -m "initial commit"

# Push to GitHub
gh repo create bubbl-api --private
git remote add origin https://github.com/<you>/bubbl-api
git push -u origin main
```

### 2.2 Deploy to Vercel

```
1. Go to vercel.com → New Project
2. Import from GitHub: select bubbl-api
3. Framework preset: Next.js
4. Root directory: apps/api  (if monorepo) or leave blank
5. Click Deploy → wait for first build
```

### 2.3 Add Environment Variables

```
Vercel Dashboard → Project → Settings → Environment Variables
Add all of these (Environment: Production + Preview):

SUPABASE_URL                    = https://xxx.supabase.co
SUPABASE_SERVICE_KEY            = eyJ...
ANTHROPIC_API_KEY               = sk-ant-...
STRIPE_SECRET_KEY               = sk_live_...
STRIPE_WEBHOOK_SECRET           = whsec_...   (add after Step 3)
STRIPE_MONTHLY_PRICE_ID         = price_...   (add after Step 3)
STRIPE_ANNUAL_PRICE_ID          = price_...   (add after Step 3)
```

### 2.4 Set Custom Domain (optional)

```
Vercel Dashboard → Project → Settings → Domains
Add: api.bubbl.app
Configure DNS at your registrar:
  CNAME api → cname.vercel-dns.com
```

### 2.5 Verify API is Working

```bash
# Test auth endpoint (should return 401)
curl -X POST https://api.bubbl.app/api/paper \
  -H "Content-Type: application/json" \
  -d '{"subject":"math"}'
# Expected: {"error":"Unauthorized"}

# Test health (add a simple /api/health route)
curl https://api.bubbl.app/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Step 3 — Stripe Setup

### 3.1 Create Account and Products

```
1. Go to stripe.com → Create account
2. Add business details + bank account for payouts
3. Dashboard → Products → Add Product:

   Product: Bubbl Premium Monthly
   Price: $9.99 / month (recurring)
   Trial: 7 days
   → Save price ID as STRIPE_MONTHLY_PRICE_ID

   Product: Bubbl Premium Annual
   Price: $79.99 / year (recurring)
   → Save price ID as STRIPE_ANNUAL_PRICE_ID
```

### 3.2 Configure Webhooks

```
Stripe Dashboard → Developers → Webhooks → Add Endpoint

Endpoint URL: https://api.bubbl.app/api/webhook/stripe

Events to listen:
  ✓ customer.subscription.created
  ✓ customer.subscription.updated
  ✓ customer.subscription.deleted
  ✓ invoice.payment_failed
  ✓ invoice.payment_succeeded

→ Add endpoint → Copy Signing Secret
→ Add to Vercel: STRIPE_WEBHOOK_SECRET = whsec_...
```

### 3.3 Enable Apple Pay + Google Pay

```
Stripe Dashboard → Settings → Payment Methods
Enable:
  ✓ Apple Pay
  ✓ Google Pay
  ✓ Card

Register domain for Apple Pay:
  Stripe Dashboard → Settings → Apple Pay
  Add domain: bubbl.app (and any others)
```

### 3.4 Test Payments

```bash
# Use Stripe test cards:
Success: 4242 4242 4242 4242, any future date, any CVC
Decline: 4000 0000 0000 0002
Requires auth: 4000 0025 0000 3155
```

---

## Step 4 — AdMob Setup

### 4.1 Create AdMob Account

```
1. Go to admob.google.com → Sign in with Google account
2. Add app → "No, it's not listed" (before App Store submission)
3. App name: Bubbl
4. Platform: iOS → Add
5. Platform: Android → Add separately (2 separate app IDs)
```

### 4.2 Create Ad Units

For each app (iOS and Android), create:

```
App Ads → Add Ad Unit:

  Name: Bubbl Banner
  Format: Banner
  → Save → Copy ad unit ID

  Name: Bubbl Interstitial
  Format: Interstitial
  → Save → Copy ad unit ID
```

### 4.3 Add App IDs to app.json

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxx~yyy",
          "iosAppId": "ca-app-pub-xxx~zzz"
        }
      ]
    ]
  }
}
```

### 4.4 Update EXPO_PUBLIC_ env vars

```bash
# In .env (local) and in EAS secrets:
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-xxx/aaa
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-xxx/bbb
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxx/ccc
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-xxx/ddd
```

---

## Step 5 — Expo EAS Builds

### 5.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 5.2 Configure app.json

```json
{
  "expo": {
    "name": "Bubbl",
    "slug": "bubbl",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#0D0D0D"
    },
    "ios": {
      "bundleIdentifier": "com.bubbl.app",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSUserTrackingUsageDescription": "This allows Bubbl to show you relevant ads."
      }
    },
    "android": {
      "package": "com.bubbl.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0D0D0D"
      }
    }
  }
}
```

### 5.3 Configure eas.json

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "your-app-store-connect-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json"
      }
    }
  }
}
```

### 5.4 Add EAS Secrets

```bash
# Add all EXPO_PUBLIC_ vars as EAS secrets
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://xxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJ..."
# ... repeat for all EXPO_PUBLIC_ vars
```

### 5.5 Build Production Apps

```bash
# Build for both platforms
eas build --platform all --profile production

# This uploads to EAS servers, builds natively, returns download links
# iOS: .ipa file
# Android: .aab file (Android App Bundle)
# Takes 10–20 minutes
```

---

## Step 6 — App Store Submissions

### iOS — Apple App Store

```
Prerequisites:
  □ Apple Developer account ($99/year) at developer.apple.com
  □ App Store Connect account (same Apple ID)

Submission:
  1. eas submit --platform ios --profile production
     (EAS uploads .ipa directly to App Store Connect)
  
  2. App Store Connect → My Apps → Bubbl → Prepare for Submission:
     □ App name: Bubbl - SAT Prep
     □ Subtitle: Adaptive SAT Practice
     □ Description: (see below)
     □ Keywords: SAT prep, SAT practice, digital SAT, college prep, PSAT
     □ Screenshots: 6.5" and 5.5" required
     □ Privacy Policy URL: https://bubbl.app/privacy
     □ Age Rating: 4+ (educational content)
     □ Pricing: Free

  3. Submit for Review → wait 1–3 business days
```

**App Store Description:**
```
Bubbl is the smartest way to prepare for the digital SAT.

Unlike static practice tests, Bubbl adapts to you. Answer a question
correctly and the next one gets harder. Miss one and Bubbl gives you
practice at the right level until you're ready to move up — just like
the real digital SAT.

WHAT MAKES BUBBL DIFFERENT:
• Real College Board question types: Easy, Medium, Hard, and Hardest
• Adaptive difficulty that matches your actual skill level
• 5,000+ original practice questions across all SAT domains
• Gap analysis powered by AI: see exactly which skills are costing you points
• Free forever — no paywall for core practice

MATH COVERAGE:
Algebra, Advanced Math, Problem Solving & Data Analysis, Geometry & Trig

ENGLISH COVERAGE:
Craft & Structure (vocabulary!), Information & Ideas,
Standard English Conventions, Expression of Ideas

PREMIUM ($9.99/month):
Unlimited papers, no ads, full gap dashboard, all domains
```

### Android — Google Play Store

```
Prerequisites:
  □ Google Play Developer account ($25 one-time) at play.google.com/console

Submission:
  1. eas submit --platform android --profile production

  2. Play Console → Create app → Bubbl
     □ App category: Education
     □ Content rating: Everyone (no violence, no adult content)
     □ Target audience: 13+
     □ Data safety form: fill out (see docs/08_security.md for data list)
     □ Screenshots: phone + 7" tablet
     □ Short description (80 chars): Adaptive SAT practice that matches your level
     □ Full description: same as iOS above

  3. Release → Production → Create release → Submit
     Review takes 3–7 business days for new apps
```

---

## Post-Launch Checklist

```
Week 1:
  □ Monitor Vercel logs for API errors
  □ Monitor Supabase logs for slow queries
  □ Check AdMob → ad fill rate > 80%
  □ Check Stripe → no failed webhooks
  □ Install Sentry in app for crash reports

Week 2:
  □ Review first App Store ratings
  □ Respond to user reviews within 24 hours
  □ Check question bank — any domains running low on unseen questions?
  □ Monitor gap analysis cost (Claude API dashboard)

Month 1:
  □ Add more questions if any domain has < 200 unseen per user
  □ A/B test Premium upgrade prompt placement
  □ Review AdMob eCPM — optimize ad units if < $5
  □ Email first 100 users for feedback
```

---

## Cost Summary — Year 1

```
One-time:
  Apple Developer Account    $99
  Google Play Developer      $25
  Domain (bubbl.app)         $15
  Total one-time:            $139

Monthly (at launch, ~0 users):
  Supabase Free              $0
  Vercel Free                $0
  Expo EAS Free              $0
  Claude API (minimal)       ~$2
  Total monthly:             ~$2

Monthly (at 5,000 MAU):
  Supabase Free              $0  (still under 50K MAU limit)
  Vercel Free                $0  (monitor function limits)
  Claude API                 ~$15
  Stripe fees (on $2,500 revenue)  ~$100
  Total costs:               ~$115
  Revenue:                   ~$3,200
  Net:                       ~$3,085/month
```
