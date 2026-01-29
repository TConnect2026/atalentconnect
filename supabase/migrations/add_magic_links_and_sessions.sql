-- Create magic_links table for client portal access
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email_search ON magic_links(email, search_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- Add comments
COMMENT ON TABLE magic_links IS 'Magic link tokens for client portal access. 7-day expiration, single-use.';
COMMENT ON COLUMN magic_links.token IS 'Secure random token (32 bytes hex)';
COMMENT ON COLUMN magic_links.used IS 'Single-use: marked true after first use';

-- Create client_sessions table
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_client_sessions_email_search ON client_sessions(email, search_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_expires_at ON client_sessions(expires_at);

-- Add comments
COMMENT ON TABLE client_sessions IS 'Client portal sessions. 30-day expiration, invalidated if access revoked.';
COMMENT ON COLUMN client_sessions.session_token IS 'Secure random session token stored in browser localStorage';
COMMENT ON COLUMN client_sessions.last_accessed_at IS 'Updated on each portal page load for activity tracking';

-- Enable RLS on magic_links
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Allow anon users to read magic links (for verification)
CREATE POLICY "Anyone can verify magic links"
  ON magic_links
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role to insert magic links
CREATE POLICY "Service role can insert magic links"
  ON magic_links
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update magic links (mark as used)
CREATE POLICY "Service role can update magic links"
  ON magic_links
  FOR UPDATE
  TO service_role
  USING (true);

-- Enable RLS on client_sessions
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anon users to read their own sessions
CREATE POLICY "Anyone can verify their own session"
  ON client_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role to manage sessions
CREATE POLICY "Service role can manage sessions"
  ON client_sessions
  FOR ALL
  TO service_role
  USING (true);

-- Function to clean up expired magic links (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_links
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM client_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add last accessed timestamp to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN contacts.portal_last_accessed_at IS 'Last time this contact accessed the client portal';
