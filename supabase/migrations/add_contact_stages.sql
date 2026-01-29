-- Create junction table to associate contacts (search participants) with interview stages they're involved in

CREATE TABLE IF NOT EXISTS contact_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate contact-stage pairs
  UNIQUE(contact_id, stage_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_stages_contact_id ON contact_stages(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_stages_stage_id ON contact_stages(stage_id);

-- Add comment
COMMENT ON TABLE contact_stages IS 'Junction table linking search participants (contacts) to the interview stages they are involved in';
