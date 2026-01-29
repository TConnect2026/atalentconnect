# TalentConnect

A modern SaaS platform for boutique executive search firms to manage searches professionally and give clients a live view of their candidate pipeline.

## Problem

Boutique search firms run good searches but look messy to clients. Everything happens in Google Sheets, email threads, and weekly updates. Existing products like Thrive are built for larger organizations, expensive, and miss key features.

## Solution

A simple SaaS platform that gives the recruiter and client a live view of the search with a kanban board interface.

## Features

- Kanban board showing candidates by stage (horizontal columns)
- Each candidate card links to full profile with resume, summary, interview notes, and scorecards
- Create and manage multiple executive searches
- Customizable pipeline stages per search
- Add candidates with detailed information
- Secure client links (coming soon)
- Document uploads (coming soon)
- LinkedIn Recruiter integration (coming soon)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up Supabase (see SETUP.md for detailed instructions):
   - Create a Supabase project
   - Run the SQL schema from `supabase-schema.sql`
   - Copy your project URL and anon key to `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  searches/           # Search management routes
    new/              # Create new search
    [id]/             # Individual search kanban view
components/
  searches/           # Search-related components
  ui/                 # shadcn/ui components
lib/
  supabase.ts         # Supabase client configuration
types/
  index.ts            # TypeScript type definitions
```

## Current Status

**Completed:**
- Project setup with Next.js, TypeScript, Tailwind CSS
- Supabase integration
- Database schema design
- Create new search functionality
- Add candidates to searches
- Kanban board view (basic)
- Search list view

**Coming Soon:**
- Drag-and-drop candidate movement between stages
- Candidate detail pages with notes and scorecards
- Secure client access links
- Document uploads (JD, interview guides, etc.)
- LinkedIn Recruiter integration
- Interview team access and notifications
- Real-time updates

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Documentation

See `SETUP.md` for detailed setup instructions including Supabase configuration and database schema.
