-- Add recruiter notes and links to candidates table

-- Add recruiter_notes field (private notes only visible to recruiter)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

-- Add links field as JSONB array for storing candidate links (GitHub, Portfolio, etc.)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN candidates.recruiter_notes IS 'Private recruiter notes - sourcing notes, initial impressions, background info. NOT visible to clients.';
COMMENT ON COLUMN candidates.links IS 'Array of candidate links (GitHub, Portfolio, Work samples, Videos, etc.) stored as JSON: [{"id": "uuid", "label": "GitHub", "url": "https://...", "type": "github"}]';
