import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
const MAX_SIZE_MB = 50;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use MP3, WAV, M4A, or OGG.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const slug = generateSlug(8);
    const ext = file.name.split('.').pop() || 'mp3';
    const storagePath = `${slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Version tracking: same filename (case-insensitive) = same version group
    const escapedName = file.name.replace(/[%_\\]/g, (c) => `\\${c}`);
    const { data: existing } = await supabase
      .from('audio_files')
      .select('id, version, version_group_id')
      .ilike('filename', escapedName)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    let version = 1;
    let versionGroupId: string | null = null;

    if (existing) {
      version = (existing.version ?? 1) + 1;
      versionGroupId = existing.version_group_id ?? existing.id;
    }

    const { data: audioData, error: dbError } = await supabase
      .from('audio_files')
      .insert({
        slug,
        filename: file.name,
        storage_path: storagePath,
        duration: null,
        version,
        version_group_id: versionGroupId,
      })
      .select('id')
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // First version in group: set version_group_id to own id
    if (!versionGroupId) {
      await supabase
        .from('audio_files')
        .update({ version_group_id: audioData.id })
        .eq('id', audioData.id);
    }

    return NextResponse.json({ slug, id: audioData.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
