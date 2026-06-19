-- Migration: add per-segment summary columns for continuity context.

ALTER TABLE story_relay_segments
  ADD COLUMN IF NOT EXISTS summary_zh TEXT,
  ADD COLUMN IF NOT EXISTS summary_en TEXT;
