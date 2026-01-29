-- Add share_recruiter_notes to candidates table for controlling recruiter notes visibility

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS share_recruiter_notes BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN candidates.share_recruiter_notes IS 'Toggle to control if recruiter notes should be shared with interviewers. Default false (private). When true, interviewers can see recruiter notes in their portal view.';
