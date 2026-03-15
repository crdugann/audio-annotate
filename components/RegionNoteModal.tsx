'use client';

import { useState, useEffect } from 'react';

type RegionNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string, author: string) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  showDelete?: boolean;
  deleting?: boolean;
  initialNote?: string;
  initialAuthor?: string;
  startTime: number;
  endTime: number;
  saving?: boolean;
  error?: string;
  success?: boolean;
};

export default function RegionNoteModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  showDelete = false,
  deleting = false,
  initialNote = '',
  initialAuthor = '',
  startTime,
  endTime,
  saving = false,
  error = '',
  success = false,
}: RegionNoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const [author, setAuthor] = useState(initialAuthor);

  useEffect(() => {
    setNote(initialNote);
    setAuthor(initialAuthor);
  }, [initialNote, initialAuthor, isOpen]);

  if (!isOpen) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saving && !deleting) onSave(note, author);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!saving && !deleting) onSave(note, author);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-2">Add note</h3>
        <p className="text-sm text-gray-500 mb-4">
          {formatTime(startTime)} – {formatTime(endTime)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (likes / dislikes)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="What did you like or dislike about this section?"
              className="w-full border rounded px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name (optional)
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Anonymous"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm mt-2 font-medium">Saved!</p>
          )}
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 min-w-[80px] bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : success ? 'Saved!' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            {showDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete()}
                disabled={saving || deleting}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
