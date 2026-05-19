-- Free-form narrative context per search. Lives on the searches row so it's
-- accessible from anywhere we have the search (Generate Search Brief, AI
-- prompts, etc.) without a JSONB lookup. Single textarea on Search Brief
-- page, autosaved on blur.

ALTER TABLE searches ADD COLUMN IF NOT EXISTS context_narrative TEXT;
