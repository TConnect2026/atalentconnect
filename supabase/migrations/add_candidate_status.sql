-- Add status tracking fields to candidates table

-- Add status field (defaults to 'active')
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'declined', 'withdrew'));

-- Add decline/withdraw reason field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Add last active stage (name of the stage they reached before declining/withdrawing)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS last_active_stage TEXT;

-- Add comments
COMMENT ON COLUMN candidates.status IS 'Candidate status: active (in pipeline), declined (company declined), withdrew (candidate withdrew)';
COMMENT ON COLUMN candidates.decline_reason IS 'Optional reason for decline/withdrawal (e.g., "Withdrew - took another offer", "Declined - culture fit concerns")';
COMMENT ON COLUMN candidates.last_active_stage IS 'Name of the last stage the candidate reached before declining/withdrawing';
