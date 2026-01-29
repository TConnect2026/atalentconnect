# TalentConnect - Quick Start Guide

## What We've Built

Your TalentConnect platform is now set up with the core recruiter admin functionality:

### Completed Features

1. **Project Setup**
   - Next.js 15 with TypeScript and Tailwind CSS
   - shadcn/ui component library for beautiful UI
   - Supabase integration for database and backend
   - Form validation with React Hook Form + Zod

2. **Database Schema**
   - Complete PostgreSQL schema in `supabase-schema.sql`
   - Tables for searches, stages, candidates, notes, scorecards, and documents
   - Automatic secure link generation for client access
   - Row Level Security (RLS) enabled

3. **Recruiter Admin Features**
   - **Searches List** (`/searches`) - View all your executive searches
   - **Create New Search** (`/searches/new`) - Set up a new search with custom pipeline stages
   - **Kanban Board** (`/searches/[id]`) - View candidates organized by stage (horizontal columns)
   - **Add Candidates** - Dialog form to add candidates with full details

## Next Steps to Get Running

### 1. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
4. Go to **Settings** > **API** and copy:
   - Project URL
   - anon/public key
5. Update `.env.local` with your actual credentials

### 2. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Create Your First Search

1. Click "New Search"
2. Fill in:
   - Company name (e.g., "Acme Corp")
   - Position title (e.g., "Chief Technology Officer")
   - Client contact information
   - Customize pipeline stages (or use defaults)
3. Click "Create Search"

### 4. Add Candidates

1. On the kanban board, click "Add Candidate"
2. Fill in candidate details:
   - Name and contact info
   - LinkedIn URL
   - Current position
   - Select which stage to add them to
3. Click "Add Candidate"

## What You'll See

**Searches List Page:**
- Grid view of all your searches
- Status badges (active, completed, on hold)
- Click any card to view the kanban board

**Kanban Board:**
- Horizontal columns for each pipeline stage
- Candidate cards showing name, title, and company
- Count of candidates in each stage
- Add candidate button

**Create Search Form:**
- Search details (company, position)
- Client contact information
- Customizable pipeline stages (defaults: Sourcing, Initial Screen, Client Interview, Final Round, Offer)

## Project Structure

```
atalentconnect/
├── app/
│   ├── page.tsx                      # Home (redirects to /searches)
│   └── searches/
│       ├── page.tsx                  # Searches list
│       ├── new/
│       │   └── page.tsx              # Create new search form
│       └── [id]/
│           └── page.tsx              # Kanban board for individual search
├── components/
│   ├── ui/                           # shadcn/ui components (button, card, input, etc.)
│   └── searches/
│       └── add-candidate-dialog.tsx  # Add candidate form dialog
├── lib/
│   ├── supabase.ts                   # Supabase client
│   └── utils.ts                      # Utility functions
├── types/
│   └── index.ts                      # TypeScript type definitions
├── supabase-schema.sql               # Database schema (run this in Supabase)
├── SETUP.md                          # Detailed setup instructions
└── .env.local                        # Environment variables (add your Supabase credentials)
```

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (you own the code)
- **Backend**: Supabase (PostgreSQL database)
- **Forms**: React Hook Form + Zod validation
- **Deployment**: Ready for Vercel

## Upcoming Features (Not Yet Built)

These features are designed but not yet implemented:

- Drag-and-drop to move candidates between stages
- Candidate detail pages with resume, notes, and scorecards
- Interview team access with real-time notifications
- Secure client access links (no login required)
- Document uploads (JD, interview guides, playbooks)
- LinkedIn Recruiter integration for one-click import
- Real-time updates using Supabase subscriptions

## Need Help?

- **Supabase Setup**: See `SETUP.md` for step-by-step instructions
- **Database Issues**: Check that you ran `supabase-schema.sql` in the SQL Editor
- **Build Errors**: Make sure all dependencies are installed with `npm install`

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Lint code
```

---

**You're all set!** Once you configure Supabase, you can start creating searches and adding candidates. The foundation is solid and ready to build out the remaining features.
