This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Quick Start

**Complete Setup Checklist:**

- [ ] 1. Install dependencies
- [ ] 2. Create Supabase project and tables
- [ ] 3. Configure `.env.local` with real values
- [ ] 4. Restart dev server
- [ ] 5. Insert test token in Supabase
- [ ] 6. Test access gate

**Detailed Steps:**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Follow [Supabase Setup](#supabase-setup) to create tables

3. **⚠️ CRITICAL: Configure `.env.local` with real values (REQUIRED)**
   - **File location:** Project root (`.env.local` template already exists)
   - **Get credentials from:** Supabase Dashboard → **Project Settings** (⚙️) → **API**
     - Copy **Project URL** → Replace `NEXT_PUBLIC_SUPABASE_URL` value
     - Copy **service_role key** (⚠️ NOT anon key) → Replace `SUPABASE_SERVICE_ROLE_KEY` value
   - **Edit `.env.local`** and replace placeholder values:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - **⚠️ IMPORTANT:** After editing `.env.local`, you MUST restart the dev server (see Step 4)

4. **Restart development server (REQUIRED after editing `.env.local`):**
   
   **Complete restart procedure:**
   ```bash
   # 1. Stop current server (press Ctrl+C in terminal)
   
   # 2. If port 3000 is still in use, kill the process:
   lsof -i :3000
   # Note the PID from output, then:
   kill -9 <PID>
   
   # 3. Clear Next.js cache (recommended)
   rm -rf .next
   
   # 4. Start dev server
   npm run dev
   ```
   
   **Verify environment variables are loaded:**
   - Check terminal output - should see NO "Missing Supabase environment variables" error
   - If error persists, verify `.env.local` exists and has correct values

5. **Insert test token in Supabase:**
   
   **Option A: Using SQL Editor (Recommended)**
   1. Go to Supabase Dashboard → **SQL Editor**
   2. Run the SQL from `supabase/seed.sql`:
      ```sql
      INSERT INTO public.access_tokens (email, token, expires_at)
      VALUES (
        'test@example.com',
        'test123',
        NOW() + INTERVAL '7 days'
      );
      ```
   3. Click **Run** to execute
   4. Verify: Should see "Success. No rows returned"
   
   **Option B: Using Table Editor**
   1. Go to Supabase Dashboard → **Table Editor**
   2. Select `access_tokens` table
   3. Click **Insert row** and fill in:
      - `email`: `test@example.com`
      - `token`: `test123`
      - `expires_at`: Click calendar icon → Select a future date (e.g., 7 days from now)
      - Leave `used_at` and `created_at` empty (auto-filled)
   4. Click **Save**

6. **Test access gate (in order):**
   
   **A. Test API endpoint first:**
   - Open: `http://localhost:3000/api/access/verify?token=test123`
   - **Expected:** `{ ok: true, expiresAt: "...", email: "test@example.com" }`
   - **If 500 error:** Check `.env.local` and restart dev server
   - **If `{ ok: false, reason: "not_found" }`:** Token not in database - insert it (Step 5)
   
   **B. Test main page:**
   - Open: `http://localhost:3000/?t=test123`
   - **Expected:** Main earthquake status page (NOT "Access expired")
   - **If "Access expired":** Check:
     - ✅ Is token in database? (Supabase Table Editor)
     - ✅ Is `expires_at` in the future?
     - ✅ Did you restart dev server after editing `.env.local`?
     - ✅ Test API endpoint first (Step A) to isolate the issue

## Environment Variables

### Step 1: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Project Settings** (⚙️) → **API**
4. Copy the following values:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (⚠️ NOT the anon key) → Use for `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Edit `.env.local` File with Real Values

**⚠️ CRITICAL:** The `.env.local` file template already exists in the project root. You need to replace the placeholder values with your actual Supabase credentials.

**File location:** Project root (same directory as `package.json`)

**How to edit:**

1. **Open `.env.local` in your editor** (it's in the project root)

2. **Replace the placeholder values:**

   **Current (placeholder):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **Replace with your actual values from Supabase Dashboard:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDUxMjM0NTYsImV4cCI6MTk2MDY5OTQ1Nn0.your-actual-service-role-key
   ```

3. **Important formatting rules:**
   - ✅ No quotes around values: `KEY=value` (NOT `KEY="value"`)
   - ✅ No spaces around `=` sign: `KEY=value` (NOT `KEY = value`)
   - ✅ No trailing spaces or empty lines with spaces
   - ✅ Use the **service_role key**, NOT the anon key

4. **Save the file**

**⚠️ IMPORTANT NOTES:**
- `.env.local` is already in `.gitignore` (`.env*` pattern) and will NOT be committed to git
- **NEVER commit `.env.local` to version control** - it contains sensitive credentials
- Use the **service_role key**, NOT the anon key (they are different!)

### Step 3: Restart Development Server (REQUIRED)

**⚠️ CRITICAL:** After editing `.env.local`, you **MUST restart** the development server for changes to take effect.

**Complete restart procedure:**

1. **Stop the current dev server:**
   - Press `Ctrl+C` in the terminal where `npm run dev` is running

2. **If port 3000 is still in use, kill the process:**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   # Output will show something like:
   # COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
   # node    12345 user   23u  IPv4  ...      0t0  TCP *:3000 (LISTEN)
   # Kill the process (replace 12345 with the actual PID from above)
   kill -9 12345
   ```

3. **Clear Next.js cache (recommended):**
   ```bash
   rm -rf .next
   ```

4. **Restart the dev server:**
   ```bash
   npm run dev
   ```

5. **Verify environment variables are loaded:**
   - Check the terminal output - there should be NO "Missing Supabase environment variables" error
   - If you still see the error, verify `.env.local` exists and has correct values

**Note:** Environment variables are only loaded when the server starts. Changes to `.env.local` require a restart.

### Step 3: Restart Development Server

After creating or modifying `.env.local`, you **MUST restart** the Next.js development server:

1. Stop the current server (press `Ctrl+C` in the terminal)
2. If port 3000 is still in use, kill the process:
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   # Kill the process (replace PID with the actual process ID)
   kill -9 PID
   ```
3. Start the server again:
   ```bash
   npm run dev
   ```

**Note:** Environment variables are only loaded when the server starts. Changes to `.env.local` require a restart.

## Supabase Setup

### Step 1: Create Tables

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL script in `supabase/sql/001_jma_cache.sql` to create the `jma_cache` table
3. Create the `access_tokens` table by running this SQL in Supabase SQL Editor:
   ```sql
   CREATE TABLE IF NOT EXISTS public.access_tokens (
     email TEXT NOT NULL,
     token TEXT PRIMARY KEY,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Step 2: Insert Test Data

To test the access gate feature, insert a test token:

**Option A: Using Supabase Table Editor**
1. Go to Supabase Dashboard → **Table Editor**
2. Select `access_tokens` table
3. Click **Insert row** and fill in:
   - `email`: `test@example.com`
   - `token`: `test123`
   - `expires_at`: Click the calendar icon and select a future date (e.g., tomorrow)
   - Leave `used_at` and `created_at` empty (they will be auto-filled)

**Option B: Using SQL Editor**
1. Go to Supabase Dashboard → **SQL Editor**
2. Run the SQL from `supabase/seed.sql`:
   ```sql
   INSERT INTO public.access_tokens (email, token, expires_at)
   VALUES (
     'test@example.com',
     'test123',
     NOW() + INTERVAL '1 day'
   );
   ```

### Step 3: Configure Environment Variables

Follow the steps in the [Environment Variables](#environment-variables) section above.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Access Token Setup (Development)

### Prerequisites

Before testing, ensure:
1. ✅ `.env.local` is configured with Supabase credentials (see [Environment Variables](#environment-variables))
2. ✅ Development server has been restarted after setting `.env.local`
3. ✅ `access_tokens` table exists in Supabase
4. ✅ Test token has been inserted (see [Supabase Setup](#supabase-setup))

### Testing the Access Gate

**Prerequisites Check:**
- ✅ `.env.local` exists in project root with correct values
- ✅ Dev server was restarted after creating `.env.local`
- ✅ Test token exists in database (see [Supabase Setup](#supabase-setup))

**Step 1: Verify API Endpoint (Recommended First Step)**

Test the API endpoint directly to ensure environment variables are loaded:

1. **Open browser and navigate to:**
   ```
   http://localhost:3000/api/access/verify?token=test123
   ```

2. **Expected Response (200 OK):**
   ```json
   {
     "ok": true,
     "expiresAt": "2026-01-15T00:00:00.000Z",
     "email": "test@example.com"
   }
   ```

3. **If you see 500 error:**
   - ✅ Check server terminal logs for "Missing Supabase environment variables"
   - ✅ Verify `.env.local` exists in project root with correct values
   - ✅ **Restart dev server completely:**
     ```bash
     # Stop server (Ctrl+C)
     rm -rf .next
     npm run dev
     ```
   - ✅ Verify environment variable names match exactly:
     - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
     - `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`)

4. **If you see `{ ok: false, reason: "not_found" }`:**
   - Token doesn't exist in database
   - Insert test token using [Supabase Setup](#supabase-setup) Step 2

5. **If you see `{ ok: false, reason: "expired" }`:**
   - Token's `expires_at` is in the past
   - Insert a new token with future expiration date

**Step 2: Test Main Page**

1. **Valid Token Test**
   - URL: `http://localhost:3000/?t=test123`
   - **Expected:** Main earthquake status page is displayed (NOT "Access expired")
   - If you see "Access expired", check:
     - Is the token in the database? (Supabase Table Editor)
     - Is `expires_at` in the future?
     - Are environment variables set correctly?
     - Did you restart the dev server after setting `.env.local`?

2. **Invalid Token Test**
   - URL: `http://localhost:3000/?t=wrong`
   - **Expected:** "Access expired" screen is displayed

3. **No Token Test**
   - URL: `http://localhost:3000/`
   - **Expected:** "Access expired" screen is displayed

### Troubleshooting

**If you see "Missing Supabase environment variables" error:**

1. **Verify `.env.local` exists:**
   ```bash
   # Check if file exists
   ls -la .env.local
   # Should show the file in project root
   ```

2. **Check file content:**
   ```bash
   # View file (DO NOT commit this output)
   cat .env.local
   # Should show:
   # NEXT_PUBLIC_SUPABASE_URL=https://...
   # SUPABASE_SERVICE_ROLE_KEY=...
   ```

3. **Verify variable names match exactly:**
   - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`)

4. **Restart dev server completely:**
   ```bash
   # Stop server
   Ctrl+C
   # Clear cache
   rm -rf .next
   # Restart
   npm run dev
   ```

**If you see 500 error on `/api/access/verify`:**

1. **Check API Response directly:**
   - Open browser DevTools → Network tab
   - Access `http://localhost:3000/api/access/verify?token=test123`
   - Check the response:
     - **500 error:** Check server terminal for "Missing Supabase environment variables"
     - **200 with `{ ok: false, reason: "not_found" }`:** Token doesn't exist in database
     - **200 with `{ ok: false, reason: "expired" }`:** Token's `expires_at` is in the past

2. **Verify Environment Variables:**
   - Ensure `.env.local` exists in project root (not in subdirectory)
   - Check that values are correct (no extra spaces, no quotes around values)
   - **Restart the dev server** (environment variables are only loaded on startup)

3. **Check Database:**
   - Go to Supabase Dashboard → Table Editor → `access_tokens`
   - Verify the test token exists and `expires_at` is in the future
   - If token doesn't exist, insert it using `supabase/seed.sql`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
