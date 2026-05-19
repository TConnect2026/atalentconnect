-- Lightweight search type field: retained (default), contingency,
-- container, other. Default ensures all existing and new rows are
-- marked correctly without manual intervention.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS search_type TEXT NOT NULL DEFAULT 'retained';
