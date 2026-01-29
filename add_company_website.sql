-- Add new fields to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;
