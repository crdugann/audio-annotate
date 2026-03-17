import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: files, error } = await supabase
      .from('audio_files')
      .select('id, slug, filename, storage_path, duration, created_at, version, version_group_id')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fileList = files ?? [];
    if (fileList.length === 0) {
      return NextResponse.json(fileList);
    }

    // Compute version_count and has_multiple_versions per file
    const groupCounts = new Map<string, number>();
    for (const f of fileList) {
      const gid = f.version_group_id ?? f.id;
      groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1);
    }

    const { data: annotations } = await supabase
      .from('annotations')
      .select('audio_id, start_time, end_time')
      .in('audio_id', fileList.map((f) => f.id));

    const annList = annotations ?? [];

    const statsByFile: Record<
      string,
      { annotation_count: number; annotated_duration: number; annotated_percentage: number | null }
    > = {};

    for (const f of fileList) {
      const fileAnns = annList.filter((a) => a.audio_id === f.id);
      const count = fileAnns.length;
      const annotatedDuration = fileAnns.reduce(
        (sum, a) => sum + Math.max(0, (a.end_time ?? a.start_time) - a.start_time),
        0
      );

      let percentage: number | null = null;
      const totalDuration = f.duration ?? null;
      if (totalDuration != null && totalDuration > 0) {
        percentage = Math.min(100, Math.round((annotatedDuration / totalDuration) * 100));
      } else if (fileAnns.length > 0) {
        const maxEnd = Math.max(...fileAnns.map((a) => a.end_time ?? a.start_time));
        if (maxEnd > 0) {
          percentage = Math.min(100, Math.round((annotatedDuration / maxEnd) * 100));
        }
      }

      statsByFile[f.id] = {
        annotation_count: count,
        annotated_duration: annotatedDuration,
        annotated_percentage: percentage,
      };
    }

    const result = fileList.map((f) => {
      const gid = f.version_group_id ?? f.id;
      const versionCount = groupCounts.get(gid) ?? 1;
      return {
        ...f,
        annotation_count: statsByFile[f.id]?.annotation_count ?? 0,
        annotated_duration: statsByFile[f.id]?.annotated_duration ?? 0,
        annotated_percentage: statsByFile[f.id]?.annotated_percentage ?? null,
        version_count: versionCount,
        has_multiple_versions: versionCount > 1,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list audio files' },
      { status: 500 }
    );
  }
}
