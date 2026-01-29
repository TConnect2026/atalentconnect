-- Add stage_id column to documents table to allow attaching interview guides to specific stages

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_stage_id ON documents(stage_id);

-- Add comment
COMMENT ON COLUMN documents.stage_id IS 'Reference to stage this document is associated with (for interview guides attached to specific stages)';
