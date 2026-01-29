-- TalentConnect Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Searches table
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  secure_link TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages table (customizable per search)
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(search_id, "order")
);

-- Candidates table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  current_company TEXT,
  current_title TEXT,
  resume_url TEXT,
  summary TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview notes table
CREATE TABLE interview_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scorecards table
CREATE TABLE scorecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  strengths TEXT,
  concerns TEXT,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('job_description', 'interview_guide', 'finalist_playbook', 'other')),
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_candidates_search_id ON candidates(search_id);
CREATE INDEX idx_candidates_stage_id ON candidates(stage_id);
CREATE INDEX idx_stages_search_id ON stages(search_id);
CREATE INDEX idx_interview_notes_candidate_id ON interview_notes(candidate_id);
CREATE INDEX idx_scorecards_candidate_id ON scorecards(candidate_id);
CREATE INDEX idx_documents_search_id ON documents(search_id);

-- Function to generate secure links
CREATE OR REPLACE FUNCTION generate_secure_link()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate secure link on search creation
CREATE OR REPLACE FUNCTION set_secure_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.secure_link IS NULL THEN
    NEW.secure_link := generate_secure_link();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_secure_link
BEFORE INSERT ON searches
FOR EACH ROW
EXECUTE FUNCTION set_secure_link();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_searches_updated_at
BEFORE UPDATE ON searches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you'll want to add proper auth later)
-- These policies will need to be updated based on your authentication strategy
CREATE POLICY "Allow all for searches" ON searches FOR ALL USING (true);
CREATE POLICY "Allow all for stages" ON stages FOR ALL USING (true);
CREATE POLICY "Allow all for candidates" ON candidates FOR ALL USING (true);
CREATE POLICY "Allow all for interview_notes" ON interview_notes FOR ALL USING (true);
CREATE POLICY "Allow all for scorecards" ON scorecards FOR ALL USING (true);
CREATE POLICY "Allow all for documents" ON documents FOR ALL USING (true);

-- Insert default stages for a new search (can be customized)
-- This is handled in the application layer to allow customization
