-- Add filled_date column to track when searches are marked as filled
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS filled_date DATE;

-- Update existing status values to new naming convention
UPDATE searches SET status = 'filled' WHERE status = 'completed';
UPDATE searches SET status = 'paused' WHERE status = 'on_hold';

-- Add comment
COMMENT ON COLUMN searches.filled_date IS 'Date when the search was successfully filled with a placement';
