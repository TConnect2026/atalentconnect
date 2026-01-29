-- Add role column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('hiring_manager', 'recruiter', 'interview_panel', 'board_member', 'other'));
