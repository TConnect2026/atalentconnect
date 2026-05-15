-- Direct Reports — array of { name, title } pairs per search.
-- Replaces the old free-text direct_reports_who / direct_reports_count
-- form fields that lived only in intake_briefs.snapshot_extras.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS direct_reports JSONB NOT NULL DEFAULT '[]'::jsonb;
