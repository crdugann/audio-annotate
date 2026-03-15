'use client';

import { useState } from 'react';
import Link from 'next/link';

type UploadResult = { slug: string; filename: string };

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);

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
