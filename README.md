# Audio Annotation

A web app for uploading audio files, sharing them via link, and adding timestamped notes. Team members can highlight time ranges on a waveform and record feedback (likes, dislikes, suggestions).

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add `.env.local` with your Supabase credentials (see [Environment](#environment)).

---

## How to Access Content

### 1. Upload Audio

- Go to the home page (`/`)
- Click **Choose File** or **Browse**
- Select one or more audio files (MP3, WAV, M4A, OGG; max 50MB each)
- Click **Upload**

After upload, you’re redirected to the audio page or see a list of links for multiple files.

### 2. Open Shared Audio

Each audio file has a shareable URL:

```
http://localhost:3000/a/[slug]
```

Example: `http://localhost:3000/a/ubr9dvgv`

Anyone with the link can view and annotate. No login required.

### 3. Bulk Upload

- Select multiple files at once (e.g. from a folder)
- Upload them in one go
- Use the list of links to open each file

---

## How to Write Notes

### Create a Region

1. **Drag** on the waveform (click, hold, and move horizontally)
2. A colored region appears
3. A modal opens to add a note

### Add or Edit a Note

1. **Click** a region
2. In the modal:
   - Enter feedback in **Note** (e.g. “very natural”, “pause too long”)
   - Optionally add your **name**
3. Click **Save**

### Other Actions

| Action | Result |
|--------|--------|
| **Click** waveform (not on a region) | Play / pause |
| **Click** region | Open note modal |
| **Drag** region | Move it |
| **Resize** region | Drag the edges |
| **Delete** (in modal) | Remove that note |
| **Delete all notes** | Remove all notes for this audio |

### Tips

- Wait for **“Saved!”** before closing or refreshing
- Notes are stored in the database and persist across refreshes
- Regions show a short preview of the note on the waveform

---

## Database Overview

The app uses **Supabase** (PostgreSQL + Storage).

### Tables

#### `audio_files`

Stores metadata for each uploaded audio file.

| Column       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| `id`        | uuid      | Primary key                          |
| `slug`      | text      | Short shareable ID (e.g. `ubr9dvgv`) |
| `filename`  | text      | Original filename                     |
| `storage_path` | text   | Path in Supabase Storage bucket      |
| `duration`  | float     | Length in seconds (optional)          |
| `created_at` | timestamp | When the record was created          |

#### `annotations`

Stores notes for time ranges on each audio file.

| Column     | Type      | Description                    |
|------------|-----------|--------------------------------|
| `id`       | uuid      | Primary key                    |
| `audio_id` | uuid      | Foreign key → `audio_files.id` |
| `start_time` | float   | Region start (seconds)         |
| `end_time` | float     | Region end (seconds)            |
| `note`     | text      | Note content                   |
| `author`   | text      | Optional display name          |
| `created_at` | timestamp | When the note was created    |

### Storage

- **Bucket:** `audio`
- **Path:** `{slug}.{ext}` (e.g. `ubr9dvgv.wav`)
- **Access:** Public read for playback

### Data Flow

```
Upload → Supabase Storage (audio files)
       → audio_files table (metadata)

Annotate → annotations table (notes linked by audio_id)

Load page → Fetch audio_files by slug
          → Fetch annotations by audio_id
          → Get public URL from Storage
          → Render waveform + regions
```

### Row-Level Security (RLS)

Policies allow public read/write for this link-based flow:

- **audio_files:** SELECT, INSERT
- **annotations:** SELECT, INSERT, UPDATE, DELETE

---

## How to Use Supabase

### 1. Create a Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose an organization, name the project, set a database password
4. Wait for the project to finish provisioning

### 2. Create the Tables

1. In the Supabase Dashboard, open **SQL Editor**
2. Click **New query**
3. Paste and run:

```sql
-- audio_files table
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- annotations table
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  note TEXT,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_annotations_audio_id ON annotations(audio_id);
CREATE INDEX idx_audio_files_slug ON audio_files(slug);
```

### 3. Add Row-Level Security (RLS)

Run this in the SQL Editor:

```sql
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read audio_files" ON audio_files FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert audio_files" ON audio_files FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public read annotations" ON annotations FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert annotations" ON annotations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update annotations" ON annotations FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete annotations" ON annotations FOR DELETE TO public USING (true);
```

### 4. Create the Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it `audio`
4. Enable **Public bucket** (so audio can play in the browser)
5. Click **Create bucket**

### 5. Add Storage Policies

1. Open the `audio` bucket
2. Go to **Policies** (or **Configuration**)
3. Add two policies via **SQL Editor** → **New query**:

```sql
-- Allow public read (playback)
CREATE POLICY "Allow public read audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio');

-- Allow anonymous upload
CREATE POLICY "Allow anonymous upload audio"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'audio');
```

### 6. Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **Publishable key** (anon/public) → use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Environment

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key
```

Use the values from step 6 above.

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Waveform:** wavesurfer.js v7 + RegionsPlugin
- **Backend:** Supabase (PostgreSQL, Storage)

---

## Scripts

| Command      | Description              |
|-------------|--------------------------|
| `npm run dev`   | Start dev server         |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |
