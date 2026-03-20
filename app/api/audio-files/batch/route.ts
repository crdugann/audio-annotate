import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** PATCH: Move selected files to a bucket (or uncategorized) */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const audioIds = body?.audio_ids as string[] | undefined;
    const bucketId = body?.bucket_id === null || body?.bucket_id === '' ? null : (body?.bucket_id as string)?.trim();

    if (!Array.isArray(audioIds) || audioIds.length === 0) {
      return NextResponse.json({ error: 'audio_ids must be a non-empty array' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from('audio_files')
      .update({ bucket_id: bucketId })
      .in('id', audioIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: audioIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to move files' },
      { status: 500 }
    );
  }
}

/** DELETE: Permanently delete selected audio files (storage + DB) */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const audioIds = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];

    if (audioIds.length === 0) {
      return NextResponse.json({ error: 'ids query param is required (comma-separated)' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: files, error: fetchError } = await supabase
      .from('audio_files')
      .select('id, storage_path')
      .in('id', audioIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('audio')
        .remove(paths);

      if (storageError) {
        return NextResponse.json({ error: `Storage: ${storageError.message}` }, { status: 500 });
      }
    }

    const { error: deleteError } = await supabase
      .from('audio_files')
      .delete()
      .in('id', audioIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: audioIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete files' },
      { status: 500 }
    );
  }
}
