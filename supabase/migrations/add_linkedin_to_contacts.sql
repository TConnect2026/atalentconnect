-- Add LinkedIn profile field to contacts table

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;

-- Add comment
COMMENT ON COLUMN contacts.linkedin_profile IS 'LinkedIn profile URL for the search participant';
