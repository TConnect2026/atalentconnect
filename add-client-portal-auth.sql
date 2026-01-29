-- Client Portal Authentication Schema
-- Run this in your Supabase SQL Editor

-- Add secure_link to searches if it doesn't exist
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS secure_link TEXT UNIQUE;

-- Create index on secure_link for faster lookups
CREATE INDEX IF NOT EXISTS idx_searches_secure_link ON searches(secure_link);

-- Create magic_links table for email verification
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_search_email ON magic_links(search_id, email);

-- Create client_sessions table for persistent authentication
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_search_email ON client_sessions(search_id, email);

-- Row Level Security
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for magic_links
DROP POLICY IF EXISTS "Allow all operations on magic_links" ON magic_links;
CREATE POLICY "Allow all operations on magic_links"
ON magic_links
FOR ALL
USING (true)
WITH CHECK (true);

-- Policies for client_sessions
DROP POLICY IF EXISTS "Allow all operations on client_sessions" ON client_sessions;
CREATE POLICY "Allow all operations on client_sessions"
ON client_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Update existing searches to have secure_link if they don't
UPDATE searches
SET secure_link = encode(gen_random_bytes(16), 'hex')
WHERE secure_link IS NULL;
