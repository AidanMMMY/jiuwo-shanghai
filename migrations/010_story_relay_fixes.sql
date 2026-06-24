-- Migration: story-relay security, concurrency, and reliability fixes

-- 1. Atomic sequence for segment order, replacing MAX(sequence)+1
CREATE SEQUENCE IF NOT EXISTS story_relay_segment_seq START 0;
SELECT setval(
  'story_relay_segment_seq',
  COALESCE((SELECT MAX(sequence) FROM story_relay_segments), -1)
);

-- 2. Database-backed rate limiting
CREATE TABLE IF NOT EXISTS story_relay_rate_limits (
  id SERIAL PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  window_index BIGINT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (ip_hash, window_index)
);

CREATE INDEX IF NOT EXISTS idx_story_relay_rate_limits_lookup
  ON story_relay_rate_limits(ip_hash, window_index);
