CREATE TABLE IF NOT EXISTS guestbook_entries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30)  NOT NULL,
  message     VARCHAR(140) NOT NULL,
  stamp       VARCHAR(10)  NOT NULL CHECK (stamp IN ('monkey', 'pig', 'wolf', 'dog', 'bear')),
  email       VARCHAR(120),
  ip_hash     VARCHAR(64)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_ip_recent ON guestbook_entries (ip_hash, created_at DESC);
