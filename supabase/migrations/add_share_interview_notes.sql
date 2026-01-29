-- Add share_interview_notes column to searches table
ALTER TABLE searches ADD COLUMN IF NOT EXISTS share_interview_notes BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN searches.share_interview_notes IS 'Whether to share interview notes with all Search Team members in client portal';
