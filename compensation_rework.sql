-- Compensation rework: free-text textarea on searches + tagged document
-- attachments via the existing `documents` table with a new `category`
-- column.

-- 1. Free-text compensation column on searches.
ALTER TABLE searches ADD COLUMN IF NOT EXISTS compensation TEXT;

-- 2. Drop the old structured compensation column (was: only Base mirrored).
ALTER TABLE searches DROP COLUMN IF EXISTS compensation_range;

-- 3. Add a `category` column to the existing documents table. Coexists
--    with the legacy `type` column so existing rows (position_spec /
--    intake_brief) keep working. New compensation uploads use `category`.
--    Values: 'jd' | 'intake_notes' | 'compensation' | 'other'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Storage bucket: this code reuses the existing `documents` bucket
-- (created earlier for position-spec uploads) so we don't need to
-- duplicate RLS policies. If you'd prefer a dedicated `search-documents`
-- bucket, create it via the Supabase dashboard and copy the existing
-- bucket's policies to it.
