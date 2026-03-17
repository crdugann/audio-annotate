# Deployment Guide: Version Tracking

After implementing version tracking, deploy in this order: **Supabase first** (database migration), then **Vercel** (app code).

---

## 1. Supabase: Run the migration

Run the SQL migration in your Supabase project to add version columns.

### Option A: Supabase Dashboard (SQL Editor)

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor** → **New query**
3. Paste and run:

```sql
-- Add version tracking columns to audio_files
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS version_group_id UUID REFERENCES audio_files(id) ON DELETE SET NULL;

-- Backfill existing rows: each is its own group (version 1, version_group_id = id)
UPDATE audio_files SET version = 1 WHERE version IS NULL;
UPDATE audio_files SET version_group_id = id WHERE version_group_id IS NULL;

-- Indexes for grouping and filename lookups
CREATE INDEX IF NOT EXISTS idx_audio_files_version_group ON audio_files(version_group_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_filename_lower ON audio_files(LOWER(filename));
```

4. Click **Run**

### Option B: Supabase CLI

If you use the Supabase CLI and have linked your project:

```bash
cd /path/to/audio-annotate
supabase db push
```

Or run the migration file directly:

```bash
supabase db execute -f supabase/migrations/20250317_add_version_tracking.sql
```

---

## 2. Vercel: Deploy the app

### Option A: Git push (recommended)

If the project is connected to a Git repo (GitHub, GitLab, Bitbucket):

1. Commit and push:

```bash
cd /path/to/audio-annotate
git add .
git commit -m "Add version tracking for audio files"
git push origin main
```

2. Vercel will auto-deploy from the connected branch.

### Option B: Vercel CLI

```bash
cd /path/to/audio-annotate
vercel --prod
```

### Option C: Manual deploy from Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) → your project
2. **Deployments** → **Deploy**
3. Or connect the repo and trigger a redeploy from the latest commit

---

## Environment variables

Ensure these are set in **Vercel** (Project → Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Verification

1. **Supabase**: In Table Editor, confirm `audio_files` has `version` and `version_group_id`.
2. **App**: Upload a file, then upload another with the same name. In the library you should see a “2 versions” badge and expandable versions.
