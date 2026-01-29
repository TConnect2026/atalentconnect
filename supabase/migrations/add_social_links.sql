-- Add social media links to searches table

-- Add LinkedIn URL field
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_linkedin TEXT;

-- Add other social channels (stored as JSONB for flexibility)
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_social_links JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN searches.company_linkedin IS 'Company LinkedIn profile URL';
COMMENT ON COLUMN searches.company_social_links IS 'Other social media links stored as JSON array: [{"platform": "Twitter", "url": "https://..."}, {"platform": "Facebook", "url": "https://..."}]';
