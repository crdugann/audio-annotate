-- Add version tracking columns to audio_files
-- version: 1, 2, 3... per group
-- version_group_id: shared by all versions of the same logical file (first upload's id)

ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS version_group_id UUID REFERENCES audio_files(id) ON DELETE SET NULL;

-- Backfill existing rows: each is its own group (version 1, version_group_id = id)
UPDATE audio_files SET version = 1 WHERE version IS NULL;
UPDATE audio_files SET version_group_id = id WHERE version_group_id IS NULL;

-- Indexes for grouping and filename lookups
CREATE INDEX IF NOT EXISTS idx_audio_files_version_group ON audio_files(version_group_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_filename_lower ON audio_files(LOWER(filename));
