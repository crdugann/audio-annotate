-- Run this in Supabase SQL Editor to enable mass Move to Bucket and Delete.
-- Adds UPDATE and DELETE policies for audio_files, and storage delete policy.

-- 1. Allow updating audio_files (e.g. bucket_id for move)
CREATE POLICY "Allow public update audio_files"
ON audio_files FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 2. Allow deleting audio_files (for bulk delete)
CREATE POLICY "Allow public delete audio_files"
ON audio_files FOR DELETE
TO public
USING (true);

-- 3. Allow deleting objects from storage.audio bucket
CREATE POLICY "Allow public delete audio storage"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'audio');
