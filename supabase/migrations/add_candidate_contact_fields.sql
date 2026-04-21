-- Email and phone already exist on candidates (from the initial schema).
-- This migration is idempotent — safe to run even if the columns are there.
-- The app uses the existing `phone` column rather than a separate `phone_number` to
-- avoid splitting data across two phone fields.

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS phone TEXT;
