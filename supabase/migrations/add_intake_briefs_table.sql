-- Intake Briefs table
-- Stores AI-generated and user-edited intake briefs per search
CREATE TABLE IF NOT EXISTS intake_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),

  -- Company research
  company_name TEXT NOT NULL DEFAULT '',
  company_research JSONB DEFAULT '{}',

  -- Organization snapshot
  org_type TEXT,
  snapshot JSONB DEFAULT '{}',

  -- Questions: array of { id, section, text, notes, order, source }
  -- source: 'ai_generated' | 'library' | 'custom'
  questions JSONB DEFAULT '[]',

  -- AI signals from JD analysis
  jd_signals JSONB DEFAULT '[]',

  -- Optional JD text used for generation
  job_description_text TEXT,

  -- Generation path: 'with_jd' | 'without_jd'
  generation_path TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'in_progress', 'complete')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by search
CREATE INDEX IF NOT EXISTS idx_intake_briefs_search_id ON intake_briefs(search_id);
CREATE INDEX IF NOT EXISTS idx_intake_briefs_firm_id ON intake_briefs(firm_id);

-- One intake brief per search
CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_briefs_unique_search ON intake_briefs(search_id);

-- RLS
ALTER TABLE intake_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intake briefs for their firm"
  ON intake_briefs FOR SELECT
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert intake briefs for their firm"
  ON intake_briefs FOR INSERT
  WITH CHECK (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update intake briefs for their firm"
  ON intake_briefs FOR UPDATE
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete intake briefs for their firm"
  ON intake_briefs FOR DELETE
  USING (firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid()));

-- Service role bypass
CREATE POLICY "Service role full access to intake_briefs"
  ON intake_briefs FOR ALL
  USING (auth.role() = 'service_role');
