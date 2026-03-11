-- Add next_up_stage_id column to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS next_up_stage_id UUID REFERENCES stages(id);
