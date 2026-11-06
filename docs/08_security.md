# 08 — Security

App: **Bubbl**

---

## Threat Model

| Threat | Risk | Mitigation |
|--------|------|-----------|
| User sees another user's data | High | Supabase RLS — DB-level policy enforcement |
| Someone calls API without auth | High | JWT verification on every route |
| Free user bypasses paper limit | Medium | Server-side check (never trust client) |
| Someone extracts question answers from API | Medium | Answers not returned until after submission |
| API abuse / DDoS | Medium | Rate limiting per IP per endpoint |
| Claude API key exposed | High | Server-only env var, never in app bundle |
| Stripe secret key exposed | Critical | Server-only, never in app bundle |
| Token stolen from device | Low | Expo SecureStore = OS-level encryption |
| Fake Stripe webhooks | High | Stripe signature verification |

---

## Authentication Flow

```
1. User opens app
         │
2. Check Expo SecureStore for existing session tokens
         │
         ├── Tokens exist + valid → auto-login, go to Home
         │
         └── No tokens / expired →
                  │
         3. Show Login screen
                  │
         4. User taps "Continue with Google" or "Continue with Apple"
            (or email + password)
                  │
         5. Supabase Auth OAuth flow (in-app browser or native)
                  │
         6. Supabase issues:
              access_token  (JWT, expires 1 hour)
              refresh_token (opaque, expires 7 days)
                  │
         7. Both stored in Expo SecureStore
            (AES-256 encrypted at rest on device)
                  │
         8. All API calls:
            Authorization: Bearer <access_token>
                  │
         9. When access_token expires:
            Supabase client auto-refreshes using refresh_token
            New access_token stored in SecureStore
                  │
        10. If refresh_token expires:
            User is logged out → back to Login screen
```

---

## Supabase Client Setup (Mobile)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// SecureStore adapter — replaces default localStorage
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // disable for React Native
    },
  }
)
```

The `SUPABASE_ANON_KEY` is safe to include in the app bundle because:
- It only allows what RLS policies permit
- Every user can only access their own rows
- The question bank is read-only at the row level
- No admin operations are possible with the anon key

---

## API Route Security

Every backend route must verify the JWT before any operation:

```typescript
// lib/auth.ts — server side (Next.js API)
import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED')
  }

  const token = authHeader.slice(7)

  // Use service key to verify — never use anon key server-side
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw new Error('INVALID_TOKEN')
  }

  return { id: user.id, email: user.email! }
}

// Usage — wrap every route handler:
export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // All logic below uses user.id safely
  const papers = await getPapers(user.id)
  return Response.json(papers)
}
```

---

## Environment Variables — Complete List

### Vercel (server-only — NEVER expose to client)

```bash
# Supabase
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # has full DB access

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
```

### Expo App (.env — safe to bundle)

These are prefixed `EXPO_PUBLIC_` which Expo includes in the bundle.
They are safe ONLY because RLS policies restrict what each key can do.

```bash
# Supabase (anon key — read-only unless user is authenticated + RLS allows)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (publishable key — safe, used only to init payment UI)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AdMob (ad unit IDs — safe, not secret)
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-xxx/yyy
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-xxx/zzz
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxx/aaa
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-xxx/bbb
```

---

## Rate Limiting

```typescript
// middleware.ts — Vercel Edge middleware
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface RateLimit {
  count: number
  reset: number
}

// In-memory store — works for single Vercel region
// For multi-region: replace with Upstash Redis
const store = new Map<string, RateLimit>()

const LIMITS = {
  '/api/gap-analysis':  { max: 5,   windowMs: 60 * 60 * 1000 },  // 5/hour — Claude API cost
  '/api/paper':         { max: 30,  windowMs: 60 * 60 * 1000 },  // 30/hour — generous
  '/api/submit-answer': { max: 500, windowMs: 60 * 60 * 1000 },  // 500/hour — ~14 sessions
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const limit = LIMITS[path as keyof typeof LIMITS]
  if (!limit) return NextResponse.next()

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const key = `${ip}:${path}`
  const now = Date.now()

  const record = store.get(key)

  if (!record || now > record.reset) {
    // New window
    store.set(key, { count: 1, reset: now + limit.windowMs })
    return NextResponse.next()
  }

  if (record.count >= limit.max) {
    const retryAfter = Math.ceil((record.reset - now) / 1000)
    return new NextResponse(
      JSON.stringify({ error: 'too_many_requests', retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        }
      }
    )
  }

  record.count++
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/gap-analysis', '/api/paper', '/api/submit-answer']
}
```

---

## COPPA Compliance (Under-13 Protection)

The app targets high school students (grades 9–12, typically 14–18). We must guard against users under 13.

```typescript
// In signup form — add age verification
function SignupScreen() {
  const [birthYear, setBirthYear] = useState('')

  function handleSubmit() {
    const age = new Date().getFullYear() - parseInt(birthYear)
    if (age < 13) {
      Alert.alert(
        'Age Requirement',
        'Bubbl is designed for students 13 and older. Please ask a parent or guardian to contact us.',
        [{ text: 'OK' }]
      )
      return
    }
    // Proceed with signup
  }
}
```

Additionally:
- Do not collect more data than necessary
- Privacy Policy must disclose data practices clearly
- AdMob: set `tagForChildDirectedTreatment: false` (not child-directed) since 13+
- Do not sell user data — AdMob contextual targeting only

---

## Data We Collect and Why

| Data | Why | Stored Where | Retained |
|------|-----|-------------|---------|
| Email | Account identity | Supabase auth.users | Until deletion |
| Name | Personalization | profiles table | Until deletion |
| Grade | Content calibration | profiles table | Until deletion |
| Target score | Content calibration | profiles table | Until deletion |
| Question answers | Adaptive engine | attempts, seen_questions | Until deletion |
| Domain ability scores | Adaptive engine | domain_ability | Until deletion |
| Gap analysis results | Personalization | gap_profile | Until deletion |
| Stripe customer ID | Subscription management | profiles table | Until deletion |
| Device IP | Rate limiting | In-memory only | 1 hour |

We do NOT collect:
- Location data
- Device contacts
- Camera or microphone
- Browsing history outside the app

---

## Apple Sign In (Required for iOS App Store)

If you offer any social login (Google), Apple requires you to also offer Sign in with Apple.

```typescript
// In Supabase Dashboard → Auth → Providers → Apple
// Configure with your Apple Developer credentials:
//   Services ID: com.bubbl.app.signin
//   Key ID: from Apple Developer portal
//   Private Key: downloaded .p8 file content

// In app — Supabase handles the full OAuth flow:
async function signInWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: 'bubbl://auth/callback'  // deep link back to app
    }
  })
}
```

---

## Security Checklist Before Launch

```
Authentication
  □ Google OAuth configured in Supabase
  □ Apple Sign In configured in Supabase (required for iOS)
  □ Email/password auth enabled
  □ JWT expiry set to 1 hour (default)
  □ Refresh token expiry set to 7 days

Database
  □ RLS enabled on ALL tables
  □ All RLS policies created and tested
  □ Service key is NOT in app bundle
  □ Anon key only used client-side

API
  □ JWT verification in every route
  □ Rate limiting active on /api/gap-analysis and /api/paper
  □ CORS configured (only allow app's domain)
  □ Stripe webhook signature verified

Secrets
  □ All server secrets in Vercel env vars (not in code)
  □ .env files are in .gitignore
  □ No secrets in git history

App Store
  □ Privacy Policy URL added to App Store listing
  □ Privacy nutrition labels filled (App Store Connect)
  □ COPPA compliance: age gate in signup
  □ AdMob: content rating set to Teen

Monitoring
  □ Vercel Analytics enabled (performance monitoring)
  □ Supabase logs enabled (query monitoring)
  □ Sentry installed (crash reporting)
```
