-- Portal visibility controls
-- Recruiter must explicitly opt each stage and candidate into the client portal.

-- Stages: when false, the funnel still shows the count but no candidate cards appear.
ALTER TABLE stages
ADD COLUMN IF NOT EXISTS visible_in_portal BOOLEAN NOT NULL DEFAULT false;

-- Candidates: when false, the card is hidden from the client portal regardless of stage.
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS visible_in_portal BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_candidates_visible_in_portal
  ON candidates(search_id, visible_in_portal);
