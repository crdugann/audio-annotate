'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Annotation } from './AudioPlayer';

export type AnnotationWithFile = Annotation & {
  filename?: string;
  slug?: string;
  url?: string;
};

type AnnotationsListProps = {
  annotations: AnnotationWithFile[];
  onJumpToRegion?: (annotation: AnnotationWithFile) => void;
  /** When true, show file info and links; when false, jump is in-page only */
  multiFile?: boolean;
  loading?: boolean;
  error?: string;
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AnnotationsList({
  annotations,
  onJumpToRegion,
  multiFile = false,
  loading = false,
  error = '',
}: AnnotationsListProps) {
  const [authorFilter, setAuthorFilter] = useState('');

  const filtered = useMemo(() => {
    if (!authorFilter.trim()) return annotations;
    const q = authorFilter.trim().toLowerCase();
    return annotations.filter(
      (a) => (a.author ?? '').toLowerCase().includes(q)
    );
  }, [annotations, authorFilter]);

  const authors = useMemo(() => {
    const set = new Set<string>();
    annotations.forEach((a) => {
      if (a.author?.trim()) set.add(a.author.trim());
    });
    return Array.from(set).sort();
  }, [annotations]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(authors.length > 0 || annotations.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by author:
          </label>
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
          {annotations.length === 0
            ? 'No annotations yet. Drag on the waveform to create a region.'
            : 'No annotations match the filter.'}
        </p>
      ) : (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.map((ann) => (
            <li
              key={ann.id}
              className="p-3 border rounded-lg bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {multiFile && ann.filename && (
                <div className="mb-1.5">
                  <Link
                    href={
                      ann.url ??
                      (ann.slug ? `/a/${ann.slug}?t=${ann.start_time}` : '#')
                    }
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {ann.filename}
                  </Link>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {formatTime(ann.start_time)}
                  {ann.end_time !== ann.start_time &&
                    ` – ${formatTime(ann.end_time)}`}
                </span>
                {ann.author && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {ann.author}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1 break-words">
                {ann.note || <em className="text-gray-400">No note</em>}
              </p>
              {(multiFile && ann.slug) || (!multiFile && onJumpToRegion) ? (
                <div className="flex gap-2 mt-2">
                  {multiFile && ann.slug ? (
                    <Link
                      href={`/a/${ann.slug}?t=${ann.start_time}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Jump to region →
                    </Link>
                  ) : (
                    onJumpToRegion && (
                      <button
                        type="button"
                        onClick={() => onJumpToRegion(ann)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Jump to region →
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
