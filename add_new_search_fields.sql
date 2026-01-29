-- Add new fields to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS reports_to TEXT,
ADD COLUMN IF NOT EXISTS work_arrangement TEXT CHECK (work_arrangement IN ('onsite', 'hybrid', 'remote'));

-- Add visibility columns to stages table
ALTER TABLE stages
ADD COLUMN IF NOT EXISTS visible_to_recruiter BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT false;
