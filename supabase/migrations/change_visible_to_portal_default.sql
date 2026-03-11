-- Change visible_to_portal default from true to false
ALTER TABLE documents ALTER COLUMN visible_to_portal SET DEFAULT false;

-- Set all existing documents to not visible by default
UPDATE documents SET visible_to_portal = false WHERE visible_to_portal IS NULL OR visible_to_portal = true;
