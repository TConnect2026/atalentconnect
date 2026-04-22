-- photo_url already exists on candidates (from add_candidate_profile_fields.sql).
-- This migration is idempotent — safe to run even if the column is there.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS photo_url TEXT;
