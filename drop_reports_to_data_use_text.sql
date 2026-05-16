-- Reports To collapses back to a single free-text field on `searches`.
-- Drop the JSONB column added in the prior chunk and ensure the plain
-- text column exists.

ALTER TABLE searches DROP COLUMN IF EXISTS reports_to_data;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS reports_to TEXT;
