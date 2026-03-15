import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AudioPlayer, { type Annotation } from '@/components/AudioPlayer';
import AudioNav from '@/components/AudioNav';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function AudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const initialSeekTime = t != null ? parseFloat(t) : undefined;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: audioFile, error: audioError } = await supabase
    .from('audio_files')
    .select('*')
    .eq('slug', slug)
    .single();

  if (audioError || !audioFile) {
    return (
      <main className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400">
            Audio not found
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            No audio file exists for this link. It may have been deleted.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to upload
            </Link>
            <Link href="/library" className="text-blue-600 dark:text-blue-400 hover:underline">
              Browse library
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from('audio')
    .getPublicUrl(audioFile.storage_path);

  const { data: annotationsData } = await supabase
    .from('annotations')
    .select('*')
    .eq('audio_id', audioFile.id)
    .order('start_time', { ascending: true });

  const annotations: Annotation[] = (annotationsData ?? []) as Annotation[];

  const { data: allFiles } = await supabase
    .from('audio_files')
    .select('slug')
    .order('created_at', { ascending: false });

  const fileList = allFiles ?? [];
  const currentIndex = fileList.findIndex((f) => f.slug === slug);
  const prevSlug = currentIndex > 0 ? fileList[currentIndex - 1]?.slug : null;
  const nextSlug = currentIndex >= 0 && currentIndex < fileList.length - 1 ? fileList[currentIndex + 1]?.slug : null;

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold truncate" title={audioFile.filename}>
          {audioFile.filename}
        </h1>
        <AudioNav prevSlug={prevSlug} nextSlug={nextSlug} />
      </div>
      <AudioPlayer
        audioUrl={publicUrl}
        audioId={audioFile.id}
        initialAnnotations={annotations}
        filename={audioFile.filename}
        slug={audioFile.slug}
        initialSeekTime={Number.isFinite(initialSeekTime) ? initialSeekTime : undefined}
      />
    </main>
  );
}
