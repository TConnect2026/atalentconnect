-- Add missing columns to candidate_activity table
-- stage_id: links activity to a specific interview stage (null = general)
-- file_size: stores uploaded file size in bytes

ALTER TABLE candidate_activity ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES stages(id) ON DELETE SET NULL;
ALTER TABLE candidate_activity ADD COLUMN IF NOT EXISTS file_size bigint;

-- Index for filtering activities by stage
CREATE INDEX IF NOT EXISTS idx_candidate_activity_stage_id ON candidate_activity(candidate_id, stage_id);
