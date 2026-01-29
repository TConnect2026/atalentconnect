-- Add launch_date and target_fill_date to searches table
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS launch_date DATE,
ADD COLUMN IF NOT EXISTS target_fill_date DATE;
