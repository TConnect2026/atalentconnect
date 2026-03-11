-- Add interview_guide_id to interviews table
-- Links an interview to a document from the search's documents library
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_guide_id UUID REFERENCES documents(id) ON DELETE SET NULL;
