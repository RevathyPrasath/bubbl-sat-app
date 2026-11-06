-- Daily contest: one per day, same 10 questions for all users
CREATE TABLE IF NOT EXISTS daily_contests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_date  date        UNIQUE NOT NULL,
  question_ids  uuid[]      NOT NULL,
  opens_at      timestamptz NOT NULL,
  closes_at     timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- One entry per user per contest
CREATE TABLE IF NOT EXISTS contest_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id      uuid        NOT NULL REFERENCES daily_contests(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers         jsonb       NOT NULL DEFAULT '{}',
  correct_count   integer     NOT NULL DEFAULT 0,
  time_taken_secs integer     NOT NULL,
  submitted_at    timestamptz DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS contest_entries_contest_rank
  ON contest_entries (contest_id, correct_count DESC, time_taken_secs ASC);

-- RLS
ALTER TABLE daily_contests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read contests
CREATE POLICY "read daily_contests" ON daily_contests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anyone authenticated can read entries (for leaderboard)
CREATE POLICY "read contest_entries" ON contest_entries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only insert their own entry
CREATE POLICY "insert own contest_entry" ON contest_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
