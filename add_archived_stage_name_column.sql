-- Snapshot of the stage NAME a candidate was archived from, captured at archive
-- time so the Archived view still displays correctly even if that stage row is
-- later deleted from the live pipeline. Archive is a historical record and stands
-- independent of the current stage list (no stage-deletion guard needed).

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS archived_stage_name TEXT;
