-- Create contacts table for multiple client contacts per search
-- Run this in your Supabase SQL Editor

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_search_id ON contacts(search_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER trigger_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (update this for production)
CREATE POLICY "Allow all for contacts" ON contacts FOR ALL USING (true);

-- Migrate existing client data from searches table to contacts table
-- This will create a contact record for each existing search
INSERT INTO contacts (search_id, name, email, is_primary)
SELECT id, client_name, client_email, true
FROM searches
WHERE client_name IS NOT NULL AND client_email IS NOT NULL
ON CONFLICT DO NOTHING;
