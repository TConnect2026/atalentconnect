-- Search Brief form has a "Reason for Opening" dropdown (new_role / backfill /
-- restructure). The value previously lived only inside
-- intake_briefs.snapshot_extras.pipeline_form.reason_for_opening; promoting
-- it to a first-class column on searches so the canonical API path
-- (generate-questions, dashboards, etc.) can SELECT it directly.

ALTER TABLE searches ADD COLUMN IF NOT EXISTS reason_for_opening TEXT;
