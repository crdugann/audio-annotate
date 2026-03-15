'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnnotationsList, { type AnnotationWithFile } from '@/components/AnnotationsList';

type AudioFile = {
  id: string;
  slug: string;
  filename: string;
  storage_path: string;
  duration: number | null;
  created_at: string;
  annotation_count?: number;
  annotated_duration?: number;
  annotated_percentage?: number | null;
};

export default function LibraryPage() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationWithFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchFiles() {
      setLoadingFiles(true);
      setError('');
      try {
        const res = await fetch('/api/audio-files');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to load files');
          return;
        }
        if (!cancelled) setFiles(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    }
    fetchFiles();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setAnnotations([]);
      setLoadingAnnotations(false);
      return;
    }
    let cancelled = false;
    async function fetchAnnotations() {
      setLoadingAnnotations(true);
      setError('');
      try {
        const ids = Array.from(selectedIds).join(',');
        const res = await fetch(`/api/annotations?audio_ids=${ids}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to load annotations');
          return;
        }
        const map = Object.fromEntries(files.map((f) => [f.id, f]));
        const anns: AnnotationWithFile[] = (data ?? []).map((a: AnnotationWithFile) => {
          const f = map[a.audio_id];
          return {
            ...a,
            filename: f?.filename,
            slug: f?.slug,
            url: f?.slug ? `/a/${f.slug}?t=${a.start_time}` : undefined,
          };
        });
        if (!cancelled) setAnnotations(anns);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load annotations');
      } finally {
        if (!cancelled) setLoadingAnnotations(false);
      }
    }
    fetchAnnotations();
    return () => { cancelled = true; };
  }, [selectedIds, files]);

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(files.map((f) => f.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">Audio Library</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Upload files
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <section className="lg:w-80 xl:w-96 shrink-0">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select audio files
          </h2>
          {loadingFiles ? (
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : error && files.length === 0 ? (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No audio files yet. <Link href="/" className="text-blue-600 hover:underline">Upload some</Link>.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Select none
                </button>
              </div>
              <ul className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2 bg-white dark:bg-gray-800/50">
                {files.map((f) => {
                  const hasAnnotations = (f.annotation_count ?? 0) > 0;
                  const pct = f.annotated_percentage;
                  return (
                    <li key={f.id} className="flex items-start gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`file-${f.id}`}
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleFile(f.id)}
                        className="rounded border-gray-300 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`file-${f.id}`}
                          className="text-sm truncate block cursor-pointer"
                          title={f.filename}
                        >
                          {f.filename}
                        </label>
                        {hasAnnotations && (
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {f.annotation_count} note{f.annotation_count !== 1 ? 's' : ''}
                            </span>
                            {pct != null && (
                              <span>
                                • {pct}% annotated
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/a/${f.slug}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Open
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected
              </p>
            </>
          )}
        </section>

        <section className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Notes from selected files
          </h2>
          {selectedIds.size === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              Select one or more audio files above to see their annotations in one view.
            </p>
          ) : (
            <AnnotationsList
              annotations={annotations}
              multiFile
              loading={loadingAnnotations}
              error={error && annotations.length === 0 ? error : ''}
            />
          )}
        </section>
      </div>
    </main>
  );
}
