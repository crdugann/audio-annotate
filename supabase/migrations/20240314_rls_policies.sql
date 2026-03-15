-- Enable RLS if not already enabled
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to audio_files (for loading audio metadata)
CREATE POLICY "Allow public read audio_files"
ON audio_files FOR SELECT
TO public
USING (true);

-- Allow public insert to audio_files (for upload flow)
CREATE POLICY "Allow public insert audio_files"
ON audio_files FOR INSERT
TO public
WITH CHECK (true);

-- Allow public read/write to annotations (no auth - anyone with link can annotate)
CREATE POLICY "Allow public read annotations"
ON annotations FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert annotations"
ON annotations FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update annotations"
ON annotations FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete annotations"
ON annotations FOR DELETE
TO public
USING (true);
