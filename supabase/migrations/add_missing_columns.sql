-- Add all missing columns needed by the edit page

-- Company details
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_location TEXT;

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_website TEXT;

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_news JSONB DEFAULT '[]'::jsonb;

-- Search notes and compensation
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS compensation_notes TEXT;

-- Timeline dates
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS target_fill_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN searches.company_location IS 'Physical location/headquarters of the client company';
COMMENT ON COLUMN searches.company_website IS 'Company website URL';
COMMENT ON COLUMN searches.company_news IS 'Company news items stored as JSON array: [{"title": "News Title", "content": "News content", "date": "2024-01-01", "url": "https://..."}]';
COMMENT ON COLUMN searches.notes IS 'General context and notes about the search (e.g., confidential search, backfill for retiring exec, board-driven search, etc.)';
COMMENT ON COLUMN searches.compensation_notes IS 'Additional compensation details, special considerations, negotiation notes';
COMMENT ON COLUMN searches.start_date IS 'When the search officially started (launch date)';
COMMENT ON COLUMN searches.target_fill_date IS 'Expected hire date or offer acceptance date';
