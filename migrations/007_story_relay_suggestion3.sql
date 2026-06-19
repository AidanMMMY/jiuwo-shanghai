-- Migration: add third suggestion columns to story relay segments.

ALTER TABLE story_relay_segments
  ADD COLUMN IF NOT EXISTS suggestion_3_zh TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_3_en TEXT;
