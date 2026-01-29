-- Fix for the generate_secure_link function
-- Run this in your Supabase SQL Editor to replace the broken function

CREATE OR REPLACE FUNCTION generate_secure_link()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;
