-- Migration: Add candidate stage notes with visibility controls
-- Creates tables for per-stage notes and attachments, plus compensation visibility

-- New table: candidate_stage_notes — stores recruiter notes + visibility per candidate per stage
CREATE TABLE IF NOT EXISTS candidate_stage_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  notes TEXT,
  visibility_level TEXT NOT NULL DEFAULT 'team_only'
    CHECK (visibility_level IN ('team_only', 'limited_access', 'full_access')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, stage_id)
);
CREATE INDEX IF NOT EXISTS idx_csn_candidate ON candidate_stage_notes(candidate_id);
ALTER TABLE candidate_stage_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on candidate_stage_notes" ON candidate_stage_notes FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_csn_updated_at BEFORE UPDATE ON candidate_stage_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- New table: stage_note_attachments — files/videos per stage note
CREATE TABLE IF NOT EXISTS stage_note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_note_id UUID NOT NULL REFERENCES candidate_stage_notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'document',
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sna_note ON stage_note_attachments(stage_note_id);
ALTER TABLE stage_note_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on stage_note_attachments" ON stage_note_attachments FOR ALL USING (true) WITH CHECK (true);

-- New column on candidates for compensation visibility
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS compensation_visibility TEXT DEFAULT 'team_only'
  CHECK (compensation_visibility IN ('team_only', 'limited_access', 'full_access'));
