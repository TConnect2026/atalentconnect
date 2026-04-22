-- Candidate pipeline status — the 5-value workflow badge shown on kanban cards.
-- Stored alongside the existing `status` column (which handles archive lifecycle)
-- to avoid the CHECK constraint on status that restricts its allowed values.

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS candidate_status TEXT;

-- Date shown next to the "Scheduled" badge. Nullable — only set when status = 'scheduled'.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS scheduled_interview_date TIMESTAMPTZ;

-- decline_reason likely already exists from add_candidate_status.sql — idempotent add.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Optional free-text note captured when recruiter picks Decline.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS decline_note TEXT;
