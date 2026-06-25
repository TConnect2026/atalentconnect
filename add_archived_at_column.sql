-- Real timestamp of when a candidate was archived (compliance/audit). Set to
-- now() in archiveCandidate, cleared to null on restore. Current-state only —
-- last write wins, no archive/restore history ledger. Complements the existing
-- archived_stage_name (where) with the when.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
