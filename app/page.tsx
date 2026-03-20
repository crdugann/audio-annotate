'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type UploadResult = { slug: string; filename: string };
type Bucket = { id: string; name: string; created_at: string };

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [creatingBucket, setCreatingBucket] = useState(false);

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

  async function createBucket(e: React.FormEvent) {
    e.preventDefault();
    const name = newBucketName.trim();
    if (!name || creatingBucket) return;
    setCreatingBucket(true);
    setError('');
    try {
      const res = await fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create bucket');
      setBuckets((prev) => [...prev, data]);
      setSelectedBucketId(data.id);
      setNewBucketName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setLoading(true);
    setError('');
    setUploaded([]);

    const results: UploadResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        if (selectedBucketId) formData.append('bucket_id', selectedBucketId);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `Upload failed: ${file.name}`);

        results.push({ slug: data.slug, filename: file.name });
        setUploaded([...results]);
      }

      setProgress('');
      if (results.length === 1) {
        window.location.href = `/a/${results[0].slug}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Audio Annotation</h1>
      <Link
        href="/library"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4"
      >
        Browse all files & notes →
      </Link>

      <div className="w-full max-w-md mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Buckets</h2>
        <form onSubmit={createBucket} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            placeholder="New bucket name"
            className="flex-1 border p-2 rounded text-sm"
          />
          <button
            type="submit"
            disabled={!newBucketName.trim() || creatingBucket}
            className="bg-gray-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
          >
            {creatingBucket ? 'Creating...' : 'Create'}
          </button>
        </form>
        <select
          value={selectedBucketId ?? ''}
          onChange={(e) => setSelectedBucketId(e.target.value || null)}
          className="w-full border p-2 rounded text-sm"
        >
          <option value="">No bucket (uncategorized)</option>
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <input
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,audio/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="border p-2 rounded"
        />
        {files.length > 0 && (
          <p className="text-sm text-gray-600">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
        )}
        <button
          type="submit"
          disabled={files.length === 0 || loading}
          className="bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Uploading...' : files.length > 1 ? `Upload ${files.length} files` : 'Upload'}
        </button>
        {progress && <p className="text-sm text-blue-600">{progress}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {uploaded.length > 0 && !loading && uploaded.length > 1 && (
          <div className="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-900/50 w-full">
            <p className="font-medium mb-2">Uploaded ({uploaded.length} files):</p>
            <ul className="space-y-1">
              {uploaded.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/a/${r.slug}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {r.filename}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/library"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block"
            >
              View all notes in one place →
            </Link>
          </div>
        )}
      </form>
    </main>
  );
}
