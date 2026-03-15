import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioId = searchParams.get('audio_id');
  const audioIdsParam = searchParams.get('audio_ids');

  const ids: string[] = [];
  if (audioIdsParam) {
    ids.push(...audioIdsParam.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (audioId) {
    ids.push(audioId);
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'audio_id or audio_ids is required' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .in('audio_id', ids)
    .order('start_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio_id, start_time, end_time, note, author } = body;

    if (!audio_id || start_time == null) {
      return NextResponse.json(
        { error: 'audio_id and start_time are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('annotations')
      .insert({
        audio_id,
        start_time: Number(start_time),
        end_time: end_time != null ? Number(end_time) : start_time,
        note: note || null,
        author: author || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create annotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioId = searchParams.get('audio_id');

  if (!audioId) {
    return NextResponse.json(
      { error: 'audio_id is required' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('audio_id', audioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
