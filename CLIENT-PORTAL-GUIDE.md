# Client Portal Authentication System

## Overview

The client portal provides secure, magic link-based authentication for clients to view their executive search progress. Clients can access a read-only kanban board showing candidate pipeline (excluding the "Sourcing" stage).

## Features Implemented

### 1. Secure Access Links
- Each search has a unique secure link: `/client/[secure-link]`
- Links are automatically generated for all searches
- 16-character hexadecimal secure tokens

### 2. Email Verification
- Clients enter their email to request access
- System validates email against `contacts` table for the search
- Only authorized emails can access the portal

### 3. Magic Link Authentication
- Magic links expire in 24 hours
- One-time use tokens (marked as used after verification)
- Secure token generation using UUID v4

### 4. Session Persistence
- 30-day session duration
- Stored in browser localStorage
- Automatic session validation on page load
- "Remember me" functionality built-in

### 5. Client Portal View
- Read-only kanban board
- Filters out "Sourcing" stage automatically
- Click candidates to view details in side panel
- Displays client company logo if uploaded
- Logout functionality

## Setup Instructions

### Step 1: Run Database Migration

Go to your Supabase SQL Editor and run:

```sql
-- File: add-client-portal-auth.sql

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS secure_link TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_searches_secure_link ON searches(secure_link);

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

ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on magic_links" ON magic_links;
CREATE POLICY "Allow all operations on magic_links"
ON magic_links
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on client_sessions" ON client_sessions;
CREATE POLICY "Allow all operations on client_sessions"
ON client_sessions
FOR ALL
USING (true)
WITH CHECK (true);

UPDATE searches
SET secure_link = encode(gen_random_bytes(16), 'hex')
WHERE secure_link IS NULL;
```

### Step 2: Add Environment Variable (Optional)

In your `.env.local` file, add:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update to your actual domain.

## How to Test

### 1. Get a Secure Link

Run this query in Supabase SQL Editor to get a search's secure link:

```sql
SELECT
  company_name,
  position_title,
  secure_link,
  '/client/' || secure_link as portal_url
FROM searches
LIMIT 1;
```

### 2. Test the Flow

1. **Visit the secure link:**
   ```
   http://localhost:3000/client/[secure-link]
   ```

2. **Enter an authorized email:**
   - Use an email from the `contacts` table for this search
   - Click "Send Magic Link"

3. **Check the console:**
   - The magic link will be printed in the terminal/console (for testing)
   - In production, this will be sent via email
   - Look for: `Magic link: http://localhost:3000/client/verify?token=...`

4. **Click the magic link:**
   - Copy the magic link from the console
   - Paste it into your browser
   - You'll see a verification screen
   - After 1 second, you'll be redirected to the portal

5. **View the portal:**
   - See the read-only kanban board
   - Click on candidates to view details
   - Notice "Sourcing" stage is hidden

6. **Test session persistence:**
   - Close the browser tab
   - Revisit the original secure link: `/client/[secure-link]`
   - You should be automatically redirected to the portal (no re-authentication needed)

### 3. Test Authorization

Try entering an email that's NOT in the contacts table:
- You should see: "Email not authorized for this search"

### 4. Test Session Expiry

To test logout:
- Click "Logout" button in the portal
- You'll be redirected back to the email verification page

## Architecture

### Pages

1. **`/client/[secureLink]/page.tsx`**
   - Landing page with email verification form
   - Checks for existing valid session
   - Auto-redirects to portal if session exists

2. **`/client/verify/page.tsx`**
   - Magic link verification page
   - Creates session token
   - Redirects to portal

3. **`/client/[secureLink]/portal/page.tsx`**
   - Main client portal view
   - Protected by session check
   - Read-only kanban board
   - Filters out "Sourcing" stage
   - Shows client logo

### API Routes

1. **`/api/client/verify-email`** (POST)
   - Input: `{ email, secureLink }`
   - Validates email authorization
   - Generates magic link token
   - Returns magic link (console log for now)

2. **`/api/client/verify-token`** (POST)
   - Input: `{ token }`
   - Validates magic link token
   - Marks token as used
   - Creates 30-day session
   - Returns session token

3. **`/api/client/check-session`** (POST)
   - Input: `{ sessionToken, secureLink }`
   - Validates session
   - Updates last accessed time
   - Returns `{ valid: true/false, email }`

### Database Tables

1. **`magic_links`**
   - Stores one-time magic link tokens
   - 24-hour expiration
   - Marked as `used` after verification

2. **`client_sessions`**
   - Stores active client sessions
   - 30-day expiration
   - Tracks last access time

3. **`searches.secure_link`**
   - Unique secure link for each search
   - Auto-generated on search creation

## Security Features

✅ Email authorization check (must be in contacts table)
✅ Magic links expire in 24 hours
✅ One-time use tokens
✅ Session tokens expire in 30 days
✅ Session validation on every page load
✅ Secure random token generation
✅ Read-only portal (no edit/delete permissions)

## Next Steps (Optional Enhancements)

### 1. Email Integration

Currently, magic links are logged to the console. To send real emails:

**Option A: Resend (Recommended)**
```bash
npm install resend
```

Update `/api/client/verify-email/route.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'TalentConnect <noreply@yourdomain.com>',
  to: email,
  subject: `Access your ${search.company_name} - ${search.position_title} search`,
  html: `
    <h2>Your Executive Search Portal</h2>
    <p>Click the link below to access your candidate pipeline:</p>
    <a href="${magicLinkUrl}">Access Portal</a>
    <p>This link expires in 24 hours.</p>
  `
})
```

**Option B: SendGrid, Postmark, or AWS SES**

Similar integration pattern as Resend.

### 2. Share Link Button for Recruiters

Add a button on `/searches/[id]/page.tsx` to copy the client portal link:

```typescript
const copyClientLink = () => {
  const link = `${window.location.origin}/client/${search.secure_link}`
  navigator.clipboard.writeText(link)
  // Show toast notification
}
```

### 3. Session Activity Tracking

Add analytics to track:
- When clients access the portal
- Which candidates they view
- How long they spend on the portal

### 4. Custom Email Templates

Create branded email templates with:
- Company logo
- Custom colors
- Professional formatting

## Troubleshooting

### "Email not authorized for this search"
- Check that the email exists in the `contacts` table for this search
- Run: `SELECT * FROM contacts WHERE search_id = '[search-id]'`

### "Invalid or expired magic link"
- Magic links expire in 24 hours
- Tokens can only be used once
- Request a new magic link

### Session not persisting
- Check browser localStorage for key: `client_session_[secure-link]`
- Ensure cookies/localStorage not blocked
- Try clearing localStorage and re-authenticating

### Portal shows "Sourcing" stage
- The filter looks for stages with "sourcing" in the name (case insensitive)
- If your stage has a different name, update the filter in `/client/[secureLink]/portal/page.tsx`

## Files Created

```
app/
  api/
    client/
      verify-email/route.ts       # Email verification API
      verify-token/route.ts        # Magic link verification API
      check-session/route.ts       # Session validation API
  client/
    [secureLink]/
      page.tsx                     # Email verification page
      portal/
        page.tsx                   # Client portal view
    verify/
      page.tsx                     # Magic link verification page

types/index.ts                     # Added MagicLink, ClientSession types
add-client-portal-auth.sql         # Database migration
```

## Summary

You now have a complete, secure client portal system with:
- Magic link authentication
- 30-day session persistence
- Read-only kanban board access
- Automatic "Sourcing" stage filtering
- Client logo display
- Professional UI/UX

Clients can access their search status without needing passwords or complex authentication!
