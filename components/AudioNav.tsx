'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type AudioNavProps = {
  prevSlug: string | null;
  nextSlug: string | null;
};

export default function AudioNav({ prevSlug, nextSlug }: AudioNavProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevSlug) {
        router.push(`/a/${prevSlug}`);
      } else if (e.key === 'ArrowRight' && nextSlug) {
        router.push(`/a/${nextSlug}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlug, nextSlug, router]);

  return (
    <nav className="flex flex-wrap items-center gap-3">
      {prevSlug ? (
        <Link
          href={`/a/${prevSlug}`}
          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          ← Previous
        </Link>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 text-sm">← Previous</span>
      )}
      {nextSlug ? (
        <Link
          href={`/a/${nextSlug}`}
          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          Next →
        </Link>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 text-sm">Next →</span>
      )}
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <Link
        href="/library"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        Browse all files
      </Link>
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        ← Back to upload
      </Link>
      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
        (← → to navigate)
      </span>
    </nav>
  );
}
