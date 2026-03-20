import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: file, error: fetchError } = await supabase
      .from('audio_files')
      .select('storage_path, filename')
      .eq('slug', slug)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from('audio')
      .download(file.storage_path);

    if (downloadError || !blob) {
      return NextResponse.json(
        { error: downloadError?.message ?? 'Failed to download' },
        { status: 500 }
      );
    }

    const filename = file.filename || file.storage_path;
    return new NextResponse(blob, {
      headers: {
        'Content-Type': blob.type || 'audio/wav',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Download failed' },
      { status: 500 }
    );
  }
}
