import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { start_time, end_time, note, author } = body;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const updates: Record<string, unknown> = {};
    if (start_time != null) updates.start_time = Number(start_time);
    if (end_time != null) updates.end_time = Number(end_time);
    if (note !== undefined) updates.note = note;
    if (author !== undefined) updates.author = author;

    const { data, error } = await supabase
      .from('annotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.from('annotations').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}
