# Setup Resume Storage in Supabase

Follow these steps to create the storage bucket for candidate resumes:

## Step 1: Create Storage Bucket

1. Go to your Supabase dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `candidate-resumes`
5. Make it **Public** (check the "Public bucket" checkbox)
6. Click **Create bucket**

## Step 2: Set Storage Policy

After creating the bucket, you need to add a policy to allow public access:

1. Click on the `candidate-resumes` bucket
2. Go to the **Policies** tab
3. Click **New Policy**
4. Select **For full customization**
5. Use the following policy:

### Policy Name: `Allow public read access`

```sql
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-resumes');
```

6. Click **Review** then **Save policy**

## Step 3: Add Upload/Update Policy

Create another policy for authenticated operations:

### Policy Name: `Allow all operations on candidate resumes`

```sql
CREATE POLICY "Allow all operations on candidate resumes"
ON storage.objects FOR ALL
USING (bucket_id = 'candidate-resumes')
WITH CHECK (bucket_id = 'candidate-resumes');
```

## Done!

Your resume storage is now ready. The application will:
- Store resumes in `resumes/{search_id}/{filename}` structure
- Accept PDF, DOC, and DOCX files up to 10MB
- Generate public URLs for viewing and downloading
