-- Add author_name and follow_up_date to candidate_activity
ALTER TABLE candidate_activity ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE candidate_activity ADD COLUMN IF NOT EXISTS follow_up_date date;

-- Index for follow-up date queries (find overdue/upcoming)
CREATE INDEX IF NOT EXISTS idx_candidate_activity_follow_up
  ON candidate_activity(follow_up_date)
  WHERE follow_up_date IS NOT NULL;
