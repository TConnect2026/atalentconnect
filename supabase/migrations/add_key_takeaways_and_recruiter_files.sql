-- Migration: Add key_takeaways (JSONB array of strings) and ensure recruiter_assessment_files exist
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS key_takeaways JSONB DEFAULT '[]';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS recruiter_assessment_files JSONB DEFAULT '[]';
