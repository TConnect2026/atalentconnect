# Storage Setup Instructions

Your storage buckets have been created but need proper policies to enable uploads.

## Quick Fix

Run this SQL in your Supabase SQL Editor to enable uploads:

1. Go to: https://irfrhwtraxaepabpwdcu.supabase.co/project/_/sql/new

2. Copy and paste the contents of `supabase/migrations/fix_storage_policies.sql`

3. Click "Run"

## What This Does

The SQL will:
- Remove any conflicting storage policies
- Create simple policies that allow public uploads and reads
- Enable document uploads, logo uploads, and file attachments

## Testing

After running the SQL, try uploading a document from the Project Details section. It should work immediately.

## Security Note

The current policies allow public uploads for development convenience. For production, you should:
1. Require authentication for uploads
2. Add user ownership checks
3. Restrict file types and sizes

You can update the policies later in: Storage > Policies in your Supabase dashboard.
