'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function UploadSuccessBanner({
  filename,
  bucketName,
}: {
  filename: string;
  bucketName: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleDismiss = () => {
    setDismissed(true);
    router.replace(pathname, { scroll: false });
  };

  if (dismissed) return null;

  return (
    <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between gap-2">
      <p className="text-sm text-green-800 dark:text-green-300">
        <span className="font-medium">{filename}</span> was uploaded to{' '}
        <span className="font-medium">{bucketName}</span> bucket
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
