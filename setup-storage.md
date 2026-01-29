# Supabase Storage Setup for TalentConnect

## Create Storage Bucket for Documents

Follow these steps to set up file storage for your documents:

### Step 1: Create the Storage Bucket

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/irfrhwtraxaepabpwdcu
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `documents`
5. Set bucket to **Public** (so files can be downloaded via direct links)
6. Click **Create bucket**

### Step 2: Set Up Storage Policies

After creating the bucket, you need to set up access policies:

1. Click on the `documents` bucket
2. Go to the **Policies** tab
3. Click **New Policy**
4. Create two policies:

**Policy 1: Allow Public Read**
- Name: `Public read access`
- Allowed operation: SELECT
- Target roles: `public`
- Policy definition: `true`

**Policy 2: Allow All Operations (for now)**
- Name: `Allow all for authenticated users`
- Allowed operation: ALL
- Target roles: `authenticated`
- Policy definition: `true`

### Quick SQL Method (Alternative)

Alternatively, run this SQL in your Supabase SQL Editor:

```sql
-- Insert storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Create policy for all operations (temporary - tighten this for production)
CREATE POLICY "Allow all for now"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

### Step 3: Verify Setup

Test that the storage is working:

1. Go to http://localhost:3000/searches/new
2. Try creating a search with a document upload
3. After creating the search, check the search detail page - you should see your uploaded documents with download buttons

### Storage Structure

Files will be organized like this:
```
documents/
  └── {search-id}/
      ├── {timestamp}.pdf
      ├── {timestamp}.docx
      └── {timestamp}.pdf
```

Each search gets its own folder, and files are named with timestamps to avoid conflicts.

### Security Note

For production, you'll want to:
1. Add authentication to your app
2. Update storage policies to restrict access based on user roles
3. Consider making the bucket private and using signed URLs for downloads
4. Add file size limits and file type validation

For now, public access is fine for development and MVP.
