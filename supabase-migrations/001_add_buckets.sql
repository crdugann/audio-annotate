-- Run this in Supabase SQL Editor to add buckets support.
-- Buckets let users organize audio files into named groups.

-- 1. Create buckets table
CREATE TABLE IF NOT EXISTS buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add bucket_id to audio_files (nullable for existing files)
ALTER TABLE audio_files
ADD COLUMN IF NOT EXISTS bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audio_files_bucket_id ON audio_files(bucket_id);

-- 3. RLS for buckets
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read buckets" ON buckets FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert buckets" ON buckets FOR INSERT TO public WITH CHECK (true);
