CREATE TABLE IF NOT EXISTS story_relay_characters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  first_segment_sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_relay_characters_name ON story_relay_characters(name);
CREATE INDEX IF NOT EXISTS idx_story_relay_characters_first_segment ON story_relay_characters(first_segment_sequence);
