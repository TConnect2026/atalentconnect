-- Add linkedin_url to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
