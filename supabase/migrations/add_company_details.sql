-- Add Company Details fields to searches table
-- These fields store information about the client company

-- Add company location field
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_location TEXT;

-- Add company website field
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_website TEXT;

-- Add company news field (stored as JSONB array)
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_news JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN searches.company_location IS 'Physical location/headquarters of the client company';
COMMENT ON COLUMN searches.company_website IS 'Company website URL';
COMMENT ON COLUMN searches.company_news IS 'Company news items stored as JSON array: [{"id": "uuid", "title": "News Title", "content": "News content", "date": "2024-01-01", "url": "https://..."}]';
