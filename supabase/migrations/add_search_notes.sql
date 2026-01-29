-- Add notes column to searches table
-- This field stores general context about the search (confidentiality, background, special circumstances)
-- Separate from compensation_notes which is specifically about compensation details

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN searches.notes IS 'General context and notes about the search (e.g., confidential search, backfill for retiring exec, board-driven search, etc.)';
