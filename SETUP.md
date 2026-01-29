# TalentConnect Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works fine)

## Supabase Setup

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: TalentConnect (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
5. Wait for the project to be created (~2 minutes)

### 2. Get Your API Keys
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")

### 3. Configure Environment Variables
1. Open `.env.local` in the project root
2. Replace the placeholder values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 4. Create Database Tables
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **Run** to execute the schema

You should see a success message and your tables will be created.

### 5. Enable Storage (for document uploads)
1. In Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it: `documents`
4. Set to **Public** (we'll add security later)
5. Click **Create bucket**

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Database Schema Overview

**Tables:**
- `searches` - Executive search projects
- `stages` - Customizable pipeline stages per search (e.g., "Sourcing", "First Interview", "Final Round")
- `candidates` - People being considered for positions
- `interview_notes` - Notes from interviews
- `scorecards` - Structured feedback from interviewers
- `documents` - Job descriptions, interview guides, playbooks

**Key Features:**
- Auto-generated secure links for client access (no login required)
- Customizable stages per search
- Real-time updates via Supabase subscriptions
- Row Level Security enabled (policies need customization for production)

## Next Steps

1. Set up Supabase project and run the schema
2. Configure environment variables
3. Start building the recruiter admin interface
4. Add authentication (Supabase Auth)
5. Implement client-facing view with secure links
6. Add LinkedIn Recruiter integration
