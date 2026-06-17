-- Migration: support memory merging, session TTL, and referential cleanup.

-- Track when a memory was last merged/updated.
ALTER TABLE darkroom_memories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Track session creation time for TTL cleanup.
ALTER TABLE darkroom_sessions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Clean up orphaned conversations before adding the foreign key.
DELETE FROM darkroom_conversations
WHERE session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM darkroom_sessions WHERE session_id = darkroom_conversations.session_id
  );

-- Enforce referential integrity between conversations and sessions.
ALTER TABLE darkroom_conversations
  ADD CONSTRAINT fk_darkroom_conversations_session
  FOREIGN KEY (session_id) REFERENCES darkroom_sessions(session_id)
  ON DELETE CASCADE;
