-- Migration: add session_id to darkroom_conversations for per-session history hydration.

ALTER TABLE darkroom_conversations
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_session
  ON darkroom_conversations(session_id, created_at DESC);
