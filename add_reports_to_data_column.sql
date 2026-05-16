-- Reports To restructured as a JSONB blob with { name, title } so both
-- pieces have a canonical home on `searches`. The old text column
-- `reports_to` stays in place for backward compat — the IntakePanel reads
-- from `reports_to_data` first and falls back to `reports_to` for the
-- title if reports_to_data hasn't been populated yet.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS reports_to_data JSONB NOT NULL DEFAULT '{}'::jsonb;
