-- Migration: add story relay segments and chapters tables.

CREATE TABLE IF NOT EXISTS story_relay_segments (
  id SERIAL PRIMARY KEY,
  sequence INTEGER NOT NULL,
  author_name VARCHAR(64) NOT NULL,
  user_prompt TEXT,
  ai_question_zh TEXT,
  ai_question_en TEXT,
  story_zh TEXT NOT NULL,
  story_en TEXT NOT NULL,
  suggestion_1_zh TEXT,
  suggestion_1_en TEXT,
  suggestion_2_zh TEXT,
  suggestion_2_en TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_relay_segments_sequence
  ON story_relay_segments(sequence);

CREATE INDEX IF NOT EXISTS idx_story_relay_segments_session_id
  ON story_relay_segments(session_id);

CREATE TABLE IF NOT EXISTS story_relay_chapters (
  id SERIAL PRIMARY KEY,
  chapter_number INTEGER NOT NULL UNIQUE,
  segments_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
