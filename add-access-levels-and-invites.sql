-- Add access levels and portal invite tracking to contacts
-- Run this in your Supabase SQL Editor

-- Add access_level column with default 'full_access'
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full_access' CHECK (access_level IN ('full_access', 'limited_access'));

-- Add portal invite tracking columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS portal_invite_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster access level lookups
CREATE INDEX IF NOT EXISTS idx_contacts_access_level ON contacts(access_level);

-- Update existing contacts to have 'full_access' by default
UPDATE contacts
SET access_level = 'full_access'
WHERE access_level IS NULL;
