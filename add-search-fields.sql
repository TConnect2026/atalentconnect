-- Add new fields to searches table and update document types
-- Run this in your Supabase SQL Editor

-- Add new columns to searches table
ALTER TABLE searches
ADD COLUMN position_location TEXT,
ADD COLUMN open_to_relocation BOOLEAN DEFAULT false,
ADD COLUMN compensation_range TEXT,
ADD COLUMN relocation_package_available BOOLEAN DEFAULT false;

-- Update document type constraint to include 'intake_form'
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents
ADD CONSTRAINT documents_type_check
CHECK (type IN ('job_description', 'interview_guide', 'finalist_playbook', 'intake_form', 'other'));
