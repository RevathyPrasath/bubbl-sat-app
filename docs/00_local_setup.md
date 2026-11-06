# 00 — Local Development Setup

App: **Bubbl**  
Machine: macOS (confirmed: Node 22, npm 10, git, Xcode CLI, Python 3.13)

---

## What You'll Run Locally

```
Terminal 1: Next.js API       → http://localhost:3000
Terminal 2: Expo Dev Server   → open on iPhone/simulator
Terminal 3: Stripe CLI        → forwards webhooks to localhost
Terminal 4: Supabase CLI      → optional, local DB
```

---

## Step 1 — Install Global Tools

```bash
# Expo CLI
npm install -g expo-cli eas-cli

# Supabase CLI (for local DB, optional but recommended)
brew install supabase/tap/supabase

# Stripe CLI (for webhook testing)
brew install stripe/stripe-cli/stripe

# Verify
expo --version        # should print 6.x
supabase --version    # should print 1.x
stripe --version      # should print 1.x
```

---

## Step 2 — Create the Project Folders

```bash
# Go to your project root
mkdir -p ~/Documents/Claude/SAT-App/apps/api
mkdir -p ~/Documents/Claude/SAT-App/apps/mobile
cd ~/Documents/Claude/SAT-App
```

### 2a — Scaffold the Next.js API

```bash
cd apps/api
npx create-next-app@latest . \
  --typescript \
  --no-tailwind \
  --no-src-dir \
  --app \
  --no-eslint \
  --import-alias "@/*"

# Install dependencies
npm install \
  @supabase/supabase-js \
  @anthropic-ai/sdk \
  stripe
```

### 2b — Scaffold the Expo Mobile App

```bash
cd ../mobile
npx create-expo-app@latest . --template blank-typescript

# Install all app dependencies
npm install \
  @supabase/supabase-js \
  expo-secure-store \
  expo-router \
  react-native-safe-area-context \
  react-native-screens \
  expo-linking \
  expo-constants \
  expo-status-bar \
  @stripe/stripe-react-native \
  react-native-google-mobile-ads \
  react-native-svg \
  react-native-reanimated \
  @react-navigation/native \
  @tanstack/react-query \
  @tanstack/query-async-storage-persister \
  @react-native-async-storage/async-storage

# Install dev dependencies
npm install -D @types/react @types/react-native
```

---

## Step 3 — Create Environment Files

### 3a — API env file

```bash
# apps/api/.env.local
cat > ~/Documents/Claude/SAT-App/apps/api/.env.local << 'EOF'
# Supabase — use your DEV project (not production!)
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-dev-service-key...

# Anthropic — same key works for dev
ANTHROPIC_API_KEY=sk-ant-...

# Stripe — TEST mode keys (not live!)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # fill after Step 6
STRIPE_MONTHLY_PRICE_ID=price_test_...
STRIPE_ANNUAL_PRICE_ID=price_test_...
EOF
```

### 3b — Mobile env file

```bash
# apps/mobile/.env
cat > ~/Documents/Claude/SAT-App/apps/mobile/.env << 'EOF'
# Supabase — same dev project
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-dev-anon-key...

# Stripe — TEST publishable key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AdMob — use TEST IDs during development (required by AdMob policy)
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-3940256099942544/2934735716
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-3940256099942544/4411468910
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-3940256099942544/6300978111
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-3940256099942544/1033173712

# API URL — your local Next.js server
EXPO_PUBLIC_API_URL=http://localhost:3000
EOF
```

> **Important:** The AdMob IDs above are Google's official test IDs. Use them always in development — using real ad unit IDs in dev is a policy violation and can get your account banned.

### 3c — Add .gitignore entries

```bash
cat >> ~/Documents/Claude/SAT-App/.gitignore << 'EOF'
# Environment files — NEVER commit these
apps/api/.env.local
apps/api/.env
apps/mobile/.env
apps/mobile/.env.local

# Dependencies
node_modules/
apps/api/.next/
apps/mobile/.expo/

# OS
.DS_Store
EOF
```

---

## Step 4 — Supabase Dev Project

You have two options. Option A is easier to start.

### Option A — Cloud Dev Project (Recommended to start)

```
1. Go to supabase.com → New Project
2. Name: bubbl-dev  (separate from any production project)
3. Region: same as prod
4. Copy the URL and keys into your .env files above
5. Run the migration:
   Dashboard → SQL Editor → paste schema/migrations/001_initial.sql → Run
```

### Option B — Local Supabase (better for offline dev)

```bash
cd ~/Documents/Claude/SAT-App

# Initialize Supabase locally
supabase init

# Start local Supabase (Docker required — install Docker Desktop first)
supabase start

# This starts:
#   Database:  postgresql://postgres:postgres@localhost:54322/postgres
#   API:       http://localhost:54321
#   Studio:    http://localhost:54323   ← visual DB browser
#   Auth:      http://localhost:54321/auth/v1

# Output will show your local keys — copy them:
#   API URL:  http://localhost:54321
#   anon key: eyJ...
#   service_role: eyJ...

# Run migration on local DB
supabase db push
# or
supabase migration up

# Open local DB studio in browser
open http://localhost:54323
```

Update `.env.local` and `.env` with local Supabase URLs if using Option B:
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<local-service-key>
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
```

Note: When using local Supabase with Expo on a physical phone, replace `localhost` with your Mac's local IP:
```bash
# Find your Mac's IP
ipconfig getifaddr en0   # e.g., 192.168.1.42

# Update mobile .env:
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.42:54321
```

---

## Step 5 — Seed the Question Bank (local)

```bash
cd ~/Documents/Claude/SAT-App

# Install Python dependency
pip3 install supabase python-dotenv

# Create seed script (if not already in schema/seed/)
cat > schema/seed/seed.py << 'EOF'
#!/usr/bin/env python3
import json, os, argparse
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('apps/api/.env.local')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    args = parser.parse_args()

    supabase = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_KEY']
    )

    with open(args.file) as f:
        questions = json.load(f)

    print(f"Seeding {len(questions)} questions from {args.file}...")
    batch_size = 500
    for i in range(0, len(questions), batch_size):
        batch = questions[i:i+batch_size]
        result = supabase.table('questions').insert(batch).execute()
        print(f"  ✓ Inserted {i}–{i+len(batch)}")

    print(f"Done.")

if __name__ == '__main__':
    main()
EOF

# Seed a batch (once you have JSON files generated)
python3 schema/seed/seed.py --file schema/seed/math_psda.json
```

For development, you don't need all 4,000 questions. Seed 50–100 questions per domain — enough to test the adaptive engine without waiting for full generation.

---

## Step 6 — Stripe Local Webhook Forwarding

Stripe webhooks are sent to your production URL. In local dev, the Stripe CLI forwards them to localhost.

```bash
# Login to Stripe CLI
stripe login
# Opens browser → authorize

# Forward webhooks to local API
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Output:
# Ready! Your webhook signing secret is whsec_xxxxx
# (copy this into apps/api/.env.local as STRIPE_WEBHOOK_SECRET)
```

Keep this running in Terminal 3 whenever testing payments locally.

---

## Step 7 — Run Everything

### Terminal 1 — API Server

```bash
cd ~/Documents/Claude/SAT-App/apps/api
npm run dev

# Output:
# ▲ Next.js 14.x
# - Local: http://localhost:3000
# - Environments: .env.local
# ✓ Ready in 1.2s
```

### Terminal 2 — Expo Dev Server

```bash
cd ~/Documents/Claude/SAT-App/apps/mobile
npx expo start

# Options shown:
# › Press s │ switch to Expo Go
# › Press i │ open iOS simulator
# › Press a │ open Android emulator
# › Press w │ open web browser
# › Scan QR code with Expo Go app (iPhone camera)
```

### Terminal 3 — Stripe CLI (when testing payments)

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### Terminal 4 — Supabase (if running locally)

```bash
supabase start   # run once, stays running
open http://localhost:54323   # DB studio
```

---

## Step 8 — iOS Simulator Setup

```bash
# Open iOS Simulator
open -a Simulator

# In Expo terminal, press 'i' to open in simulator
# Or scan QR code with real iPhone (Expo Go app)

# Install Expo Go on iPhone:
# App Store → search "Expo Go" → install
# Scan QR code from Terminal 2

# Note: Some features don't work in Expo Go:
#   - Apple Sign In (needs dev build)
#   - AdMob (needs dev build)
#   - Stripe payment sheet (works in Expo Go)
```

### For full feature testing — create a Dev Build

```bash
# One-time: builds an app with all native modules
eas build --profile development --platform ios

# Install on simulator or device from EAS dashboard
# Then press 'i' in Expo → opens in your dev build instead of Expo Go
```

---

## Step 9 — Android Emulator Setup

```bash
# Option A: Android Studio (full emulator)
# Download Android Studio → open → SDK Manager → create AVD

# Option B: Expo Go on physical Android phone
# Play Store → "Expo Go" → scan QR code from Terminal 2

# In Expo terminal, press 'a' to open Android emulator
```

---

## Quick API Testing (without the app)

Test API endpoints directly with curl or a REST client (Hoppscotch, Insomnia):

```bash
# 1. Get a test JWT — sign in via Supabase to get a token
# Easiest: use Supabase Dashboard → Authentication → Users → create test user
# Then sign in via curl:

TOKEN=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpass123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"

# 2. Test /api/paper
curl -s -X POST http://localhost:3000/api/paper \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"math","focus":"psda"}' | python3 -m json.tool

# 3. Test /api/gap-analysis
curl -s -X POST http://localhost:3000/api/gap-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# 4. Test auth rejection (no token)
curl -s -X POST http://localhost:3000/api/paper \
  -H "Content-Type: application/json" \
  -d '{"subject":"math"}'
# Expected: {"error":"Unauthorized"}
```

---

## Create a Test User

```bash
# Via Supabase Dashboard
Dashboard → Authentication → Users → Add User
  Email: test@bubbl.app
  Password: TestPass123!

# Or via curl
curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@bubbl.app",
    "password": "TestPass123!",
    "email_confirm": true
  }'
```

---

## Test Stripe Payments Locally

```bash
# Use Stripe test cards in the app:
Card number: 4242 4242 4242 4242
Expiry: any future date (e.g., 12/29)
CVC: any 3 digits (e.g., 123)
ZIP: any 5 digits (e.g., 12345)

# Simulate declined card:
4000 0000 0000 0002

# Simulate card requiring authentication:
4000 0025 0000 3155
```

When you tap "Start Free Trial" in the app with the Stripe CLI running, you'll see the webhook arrive in Terminal 3 and the user's plan update in Supabase.

---

## Environment Summary

| Service | Local Dev | Notes |
|---------|-----------|-------|
| Next.js API | localhost:3000 | `npm run dev` |
| Supabase | cloud dev project or localhost:54321 | separate from prod |
| Stripe | test mode | sk_test_ keys, test cards |
| AdMob | Google test IDs | hardcoded test unit IDs |
| Expo | Expo Go or dev build | Expo Go for quick testing |
| iOS Simulator | built-in with Xcode CLI | press 'i' in Expo |

---

## Common Issues and Fixes

**"Cannot connect to Supabase"**
```bash
# Check URL in .env — must NOT have trailing slash
SUPABASE_URL=https://xxx.supabase.co   ✓
SUPABASE_URL=https://xxx.supabase.co/  ✗
```

**"Network request failed" on physical phone**
```bash
# Phone can't reach localhost — use your Mac's IP
ipconfig getifaddr en0    # get IP, e.g. 192.168.1.42
# Update EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SUPABASE_URL in mobile .env
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.42:54321   # if using local supabase
```

**"JWT expired" errors during testing**
```bash
# JWTs expire in 1 hour — just sign in again to get a fresh token
# Or set a longer expiry in Supabase:
# Dashboard → Auth → Settings → JWT Expiry → set to 86400 (24h) for dev
```

**Expo "SDK version mismatch"**
```bash
npx expo install --fix   # auto-fixes package version mismatches
```

**"supabase: command not found"**
```bash
brew install supabase/tap/supabase
# or
npm install -g supabase
```

**Stripe webhook "No signatures found"**
```bash
# Make sure stripe listen is running in Terminal 3
# Make sure STRIPE_WEBHOOK_SECRET in .env.local matches the whsec_ from stripe listen output
# They change every time you restart stripe listen
```
