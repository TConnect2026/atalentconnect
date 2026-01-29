-- Drop the unique constraint on stages that's causing issues with delete+insert pattern
-- The constraint stages_search_id_order_key enforces unique (search_id, order) pairs
-- but this causes problems when we delete all stages and re-insert them

ALTER TABLE stages DROP CONSTRAINT IF EXISTS stages_search_id_order_key;

-- Optionally, we can add it back as a non-unique index for performance
-- CREATE INDEX IF NOT EXISTS idx_stages_search_order ON stages(search_id, order);
