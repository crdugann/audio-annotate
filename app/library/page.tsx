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
  version?: number;
  version_group_id?: string | null;
  bucket_id?: string | null;
  version_count?: number;
  has_multiple_versions?: boolean;
  annotation_count?: number;
  annotated_duration?: number;
  annotated_percentage?: number | null;
};

type Bucket = { id: string; name: string; created_at: string };

function groupFilesByVersion(files: AudioFile[]): Map<string, AudioFile[]> {
  const groups = new Map<string, AudioFile[]>();
  for (const f of files) {
    const gid = f.version_group_id ?? f.id;
    const list = groups.get(gid) ?? [];
    list.push(f);
    groups.set(gid, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
  }
  return groups;
}

function groupByBucket(
  files: AudioFile[],
  buckets: Bucket[]
): { bucketId: string | null; bucketName: string; files: AudioFile[] }[] {
  const byBucket = new Map<string | null, AudioFile[]>();
  for (const f of files) {
    const bid = f.bucket_id ?? null;
    const list = byBucket.get(bid) ?? [];
    list.push(f);
    byBucket.set(bid, list);
  }
  const bucketMap = new Map(buckets.map((b) => [b.id, b]));
  const result: { bucketId: string | null; bucketName: string; files: AudioFile[] }[] = [];
  for (const [bid, fileList] of byBucket.entries()) {
    const name = bid ? bucketMap.get(bid)?.name ?? 'Unknown' : 'Uncategorized';
    result.push({ bucketId: bid, bucketName: name, files: fileList });
  }
  result.sort((a, b) => {
    if (a.bucketId == null) return 1;
    if (b.bucketId == null) return -1;
    return a.bucketName.localeCompare(b.bucketName);
  });
  return result;
}

export default function LibraryPage() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationWithFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [moveTargetBucketId, setMoveTargetBucketId] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchBuckets() {
      try {
        const res = await fetch('/api/buckets');
        const data = await res.json();
        if (res.ok && !cancelled) setBuckets(data ?? []);
      } catch {
        // ignore
      }
    }
    fetchBuckets();
    return () => { cancelled = true; };
  }, []);

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
          const versionLabel = f?.version != null ? ` (v${f.version})` : '';
          return {
            ...a,
            filename: f?.filename ? `${f.filename}${versionLabel}` : undefined,
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

  const bucketGroups = groupByBucket(files, buckets);
  const groups = groupFilesByVersion(files);

  const toggleBucketExpanded = (bucketKey: string) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucketKey)) next.delete(bucketKey);
      else next.add(bucketKey);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    const versionIds = groups.get(groupId)?.map((f) => f.id) ?? [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = versionIds.every((id) => next.has(id));
      if (allSelected) {
        versionIds.forEach((id) => next.delete(id));
      } else {
        versionIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const isGroupSelected = (groupId: string) => {
    const versionIds = groups.get(groupId)?.map((f) => f.id) ?? [];
    return versionIds.length > 0 && versionIds.every((id) => selectedIds.has(id));
  };

  const selectAll = () => {
    setSelectedIds(new Set(files.map((f) => f.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
    setError('');
  };

  const refreshFiles = async () => {
    try {
      const res = await fetch('/api/audio-files');
      const data = await res.json();
      if (res.ok) setFiles(data ?? []);
    } catch {
      // ignore
    }
  };

  const handleMoveToBucket = async (bucketId: string | null) => {
    if (selectedIds.size === 0 || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/audio-files/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_ids: Array.from(selectedIds), bucket_id: bucketId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to move');
      await refreshFiles();
      setSelectedIds(new Set());
      setMoveTargetBucketId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move files');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBucketAndMove = async () => {
    const name = newBucketName.trim();
    if (!name || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      const createRes = await fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? 'Failed to create bucket');
      await handleMoveToBucket(createData.id);
      setBuckets((prev) => [...prev, createData]);
      setNewBucketName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create and move');
      setActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || actionLoading) return;
    if (!confirm(`Permanently delete ${selectedIds.size} file${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/audio-files/batch?ids=${encodeURIComponent(Array.from(selectedIds).join(','))}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      await refreshFiles();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setActionLoading(false);
    }
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
              {selectedIds.size > 0 && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected
                  </p>
                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Move to bucket:</span>
                    <select
                      value={moveTargetBucketId ?? ''}
                      onChange={(e) => setMoveTargetBucketId(e.target.value || null)}
                      className="text-xs border rounded px-2 py-1.5 bg-white dark:bg-gray-800"
                    >
                      <option value="">Uncategorized</option>
                      {buckets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleMoveToBucket(moveTargetBucketId)}
                      disabled={actionLoading}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Moving...' : 'Move'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Or create new:</span>
                    <input
                      type="text"
                      value={newBucketName}
                      onChange={(e) => setNewBucketName(e.target.value)}
                      placeholder="Bucket name"
                      className="text-xs border rounded px-2 py-1.5 w-32"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBucketAndMove}
                      disabled={!newBucketName.trim() || actionLoading}
                      className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      Create & move
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={actionLoading}
                    className="text-xs px-3 py-1.5 border border-red-300 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {actionLoading ? 'Deleting...' : 'Delete selected'}
                  </button>
                </div>
              )}
              <ul className="space-y-1 max-h-[400px] overflow-y-auto border rounded-lg p-2 bg-white dark:bg-gray-800/50">
                {bucketGroups.map(({ bucketId, bucketName, files: bucketFiles }) => {
                  const bucketKey = bucketId ?? '__uncategorized__';
                  const isBucketExpanded = !collapsedBuckets.has(bucketKey);
                  const groupEntries = Array.from(groupFilesByVersion(bucketFiles).entries());
                  return (
                    <li key={bucketKey} className="border-b border-gray-200 dark:border-gray-600 last:border-0 pb-2 last:pb-0">
                      <button
                        type="button"
                        onClick={() => toggleBucketExpanded(bucketKey)}
                        className="flex items-center gap-2 w-full text-left py-2 font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1"
                      >
                        <span className={isBucketExpanded ? 'rotate-90' : ''}>▶</span>
                        <span>{bucketName}</span>
                        <span className="text-xs text-gray-500 font-normal">
                          ({bucketFiles.length} file{bucketFiles.length !== 1 ? 's' : ''})
                        </span>
                      </button>
                      {isBucketExpanded && (
                        <ul className="space-y-1 mt-1">
                          {groupEntries.map(([groupId, versions]) => {
                  const primary = versions[0]!;
                  const hasMultiple = versions.length > 1;
                  const expanded = expandedGroups.has(groupId);
                  const groupSelected = isGroupSelected(groupId);
                  const totalNotes = versions.reduce((s, v) => s + (v.annotation_count ?? 0), 0);
                  return (
                    <li key={groupId} className="py-1">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={`group-${groupId}`}
                          checked={groupSelected}
                          onChange={() => toggleGroup(groupId)}
                          className="rounded border-gray-300 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label
                              htmlFor={`group-${groupId}`}
                              className="text-sm truncate cursor-pointer"
                              title={primary.filename}
                            >
                              {primary.filename}
                            </label>
                            {!hasMultiple && (
                              <>
                                <a
                                  href={`/api/audio/${primary.slug}/download`}
                                  download={primary.filename}
                                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                >
                                  Download
                                </a>
                                <Link
                                  href={`/a/${primary.slug}`}
                                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                >
                                  Open
                                </Link>
                              </>
                            )}
                            {hasMultiple && (
                              <>
                                <Link
                                  href={`/a/versions/${primary.slug}`}
                                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                >
                                  Compare
                                </Link>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                                  {versions.length} versions
                                </span>
                              </>
                            )}
                            {hasMultiple && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(groupId)}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                {expanded ? '▼' : '▶'}
                              </button>
                            )}
                          </div>
                          {totalNotes > 0 && (
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {totalNotes} note{totalNotes !== 1 ? 's' : ''} total
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {expanded && hasMultiple && (
                        <ul className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                          {versions.map((f) => {
                            const hasAnnotations = (f.annotation_count ?? 0) > 0;
                            return (
                              <li key={f.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">
                                  v{f.version ?? 1}
                                </span>
                                {hasAnnotations && (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    {f.annotation_count} note{(f.annotation_count ?? 0) !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {!hasAnnotations && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">0 notes</span>
                                )}
                                <a
                                  href={`/api/audio/${f.slug}/download`}
                                  download={f.filename}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Download
                                </a>
                                <Link
                                  href={`/a/${f.slug}`}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                                >
                                  Open
                                </Link>
                              </li>
                            );
                          })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                        </ul>
                      )}
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
