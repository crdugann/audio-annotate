import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AudioPlayer, { type Annotation } from '@/components/AudioPlayer';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type VersionWithAnnotations = {
  id: string;
  slug: string;
  filename: string;
  version: number;
  storage_path: string;
  publicUrl: string;
  annotations: Annotation[];
};

export default async function VersionsComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const versionGroupId = audioFile.version_group_id ?? audioFile.id;
  const { data: allVersions } = await supabase
    .from('audio_files')
    .select('id, slug, filename, version, storage_path')
    .or(`version_group_id.eq.${versionGroupId},id.eq.${versionGroupId}`)
    .order('version', { ascending: true });

  const versions = allVersions ?? [];
  if (versions.length < 2) {
    return (
      <main className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
        <div className="p-6 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <h1 className="text-xl font-bold text-amber-700 dark:text-amber-400">
            No other versions
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            This file has only one version. Upload another file with the same name to create versions for comparison.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href={`/a/${slug}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to single view
            </Link>
            <Link href="/library" className="text-blue-600 dark:text-blue-400 hover:underline">
              Browse library
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const versionsWithData: VersionWithAnnotations[] = await Promise.all(
    versions.map(async (v) => {
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(v.storage_path);

      const { data: anns } = await supabase
        .from('annotations')
        .select('*')
        .eq('audio_id', v.id)
        .order('start_time', { ascending: true });

      return {
        ...v,
        version: v.version ?? 1,
        publicUrl,
        annotations: (anns ?? []) as Annotation[],
      };
    })
  );

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate" title={audioFile.filename}>
            Compare versions: {audioFile.filename}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Play each version and compare notes to see if feedback from v1 was addressed in v2
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/a/${slug}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Single view
          </Link>
          <Link
            href="/library"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Browse library
          </Link>
        </div>
      </div>

      <div className="space-y-10">
        {versionsWithData.map((v) => (
          <section
            key={v.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 bg-white dark:bg-gray-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Version {v.version}
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({v.annotations.length} note{v.annotations.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/audio/${v.slug}/download`}
                  download={v.filename}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Download
                </a>
                <Link
                  href={`/a/${v.slug}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open full view →
                </Link>
              </div>
            </div>
            <AudioPlayer
              audioUrl={v.publicUrl}
              audioId={v.id}
              initialAnnotations={v.annotations}
              filename={v.filename}
              slug={v.slug}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
