-- Add visible_in_client_portal column to stages table
-- Default to true so existing stages remain visible
ALTER TABLE stages ADD COLUMN IF NOT EXISTS visible_in_client_portal BOOLEAN DEFAULT true;

-- Optionally, set recruiter screen stages to not visible by default
-- UPDATE stages SET visible_in_client_portal = false WHERE LOWER(name) LIKE '%recruiter%screen%';
