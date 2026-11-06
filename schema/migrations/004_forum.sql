-- Forum tables: posts and replies with AI-moderated approval flow

CREATE TABLE IF NOT EXISTS forum_posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic            text        NOT NULL,
  title            text        NOT NULL,
  body             text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  rejection_reason text,
  ai_review        jsonb,
  created_at       timestamptz DEFAULT now(),
  approved_at      timestamptz
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  status     text        NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Indexes for the most common access patterns
CREATE INDEX IF NOT EXISTS forum_posts_topic_status_created
  ON forum_posts (topic, status, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_posts_status_created
  ON forum_posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_replies_post_id_status
  ON forum_replies (post_id, status, created_at ASC);

-- RLS
ALTER TABLE forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies  ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read approved posts
CREATE POLICY "read approved forum_posts" ON forum_posts
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'approved');

-- Users can insert their own posts
CREATE POLICY "insert own forum_post" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authenticated users can read approved replies
CREATE POLICY "read approved forum_replies" ON forum_replies
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'approved');

-- Users can insert their own replies
CREATE POLICY "insert own forum_reply" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
