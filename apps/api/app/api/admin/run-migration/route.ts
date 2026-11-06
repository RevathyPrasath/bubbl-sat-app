import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'bubbl-dev-seed'

// One-shot DDL statements executed via postgres functions that exist in every Supabase project
const MIGRATION_STEPS = [
  // Step 1: Create daily_contests table
  `
  CREATE TABLE IF NOT EXISTS daily_contests (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_date  date        UNIQUE NOT NULL,
    question_ids  uuid[]      NOT NULL,
    opens_at      timestamptz NOT NULL,
    closes_at     timestamptz NOT NULL,
    created_at    timestamptz DEFAULT now()
  )
  `,
  // Step 2: Create contest_entries table
  `
  CREATE TABLE IF NOT EXISTS contest_entries (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id      uuid        NOT NULL REFERENCES daily_contests(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    answers         jsonb       NOT NULL DEFAULT '{}',
    correct_count   integer     NOT NULL DEFAULT 0,
    time_taken_secs integer     NOT NULL,
    submitted_at    timestamptz DEFAULT now(),
    UNIQUE(contest_id, user_id)
  )
  `,
  // Step 3: Index
  `CREATE INDEX IF NOT EXISTS contest_entries_contest_rank
     ON contest_entries (contest_id, correct_count DESC, time_taken_secs ASC)`,
  // Step 4: RLS
  `ALTER TABLE daily_contests  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY`,
  // Step 5: Policies
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_contests' AND policyname='read daily_contests') THEN
       CREATE POLICY "read daily_contests" ON daily_contests FOR SELECT USING (auth.role() = 'authenticated');
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contest_entries' AND policyname='read contest_entries') THEN
       CREATE POLICY "read contest_entries" ON contest_entries FOR SELECT USING (auth.role() = 'authenticated');
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contest_entries' AND policyname='insert own contest_entry') THEN
       CREATE POLICY "insert own contest_entry" ON contest_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
     END IF;
   END $$`,
]

export async function POST(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use the Supabase Management API (requires SUPABASE_ACCESS_TOKEN env var)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]

  if (!accessToken || !projectRef) {
    return Response.json({
      error: 'SUPABASE_ACCESS_TOKEN env var required. Get one at supabase.com/dashboard/account/tokens and add it to .env.local',
      projectRef,
      hasToken: !!accessToken,
    }, { status: 500 })
  }

  const results: { step: number; sql: string; ok: boolean; error?: string }[] = []

  for (let i = 0; i < MIGRATION_STEPS.length; i++) {
    const sql = MIGRATION_STEPS[i].trim()
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })

    const body = await res.json() as { error?: string }
    if (!res.ok && body.error) {
      results.push({ step: i + 1, sql: sql.slice(0, 60), ok: false, error: body.error })
    } else {
      results.push({ step: i + 1, sql: sql.slice(0, 60), ok: true })
    }
  }

  const failed = results.filter(r => !r.ok)
  return Response.json({
    success: failed.length === 0,
    results,
    failed: failed.length,
  })
}
