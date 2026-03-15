'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import RegionNoteModal from './RegionNoteModal';
import AnnotationsList, { type AnnotationWithFile } from './AnnotationsList';

export type Annotation = {
  id: string;
  audio_id: string;
  start_time: number;
  end_time: number;
  note: string | null;
  author: string | null;
  created_at: string;
};

type AudioPlayerProps = {
  audioUrl: string;
  audioId: string;
  initialAnnotations: Annotation[];
  filename?: string;
  slug?: string;
  initialSeekTime?: number;
};

const REGION_COLOR = 'rgba(59, 130, 246, 0.4)';

/** Ensure region has visible width (WaveSurfer can hide zero-length regions) */
function regionEnd(ann: Annotation): number {
  const end = ann.end_time ?? ann.start_time;
  return end <= ann.start_time ? ann.start_time + 0.01 : end;
}

export default function AudioPlayer({
  audioUrl,
  audioId,
  initialAnnotations,
  filename,
  slug,
  initialSeekTime,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const annotationsRef = useRef<Annotation[]>(initialAnnotations);
  const isProgrammaticAddRef = useRef(false);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  annotationsRef.current = annotations;
  const [isReady, setIsReady] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    region: { id: string; start: number; end: number; setContent: (c: string | HTMLElement) => void; setOptions: (o: object) => void; remove: () => void } | null;
    annotationId: string | null;
    startTime: number;
    endTime: number;
    initialNote: string;
    initialAuthor: string;
  }>({
    isOpen: false,
    region: null,
    annotationId: null,
    startTime: 0,
    endTime: 0,
    initialNote: '',
    initialAuthor: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const refetchAnnotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/annotations?audio_id=${audioId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAnnotations(data);
      }
    } catch {
      // Ignore refetch errors
    }
  }, [audioId]);

  const syncRegionsFromAnnotations = useCallback((anns: Annotation[]) => {
    const regions = regionsRef.current;
    const ws = wavesurferRef.current;
    if (!regions || !ws) return;
    const dur = ws.getDuration();
    if (!dur || dur <= 0) return;
    regions.clearRegions();
    isProgrammaticAddRef.current = true;
    try {
      anns.forEach((ann) => {
        regions.addRegion({
          id: ann.id,
          start: ann.start_time,
          end: regionEnd(ann),
          color: REGION_COLOR,
          content: ann.note ? truncate(ann.note, 30) : 'New note',
          drag: true,
          resize: true,
        });
      });
    } finally {
      isProgrammaticAddRef.current = false;
    }
  }, []);

  useEffect(() => {
    const warnBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving || deleting || deletingAll) e.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [saving, deleting, deletingAll]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      dragToSeek: false,
      url: audioUrl,
      plugins: [regions],
    });

    wavesurferRef.current = ws;

    ws.on('decode', () => {
      isProgrammaticAddRef.current = true;
      try {
        annotationsRef.current.forEach((ann) => {
          regions.addRegion({
            id: ann.id,
            start: ann.start_time,
            end: regionEnd(ann),
            color: REGION_COLOR,
            content: ann.note ? truncate(ann.note, 30) : 'New note',
            drag: true,
            resize: true,
          });
        });
      } finally {
        isProgrammaticAddRef.current = false;
      }
      regions.enableDragSelection({
        color: REGION_COLOR,
      });
      setIsReady(true);
      if (initialSeekTime != null && initialSeekTime > 0) {
        const dur = ws.getDuration();
        if (dur && dur > 0) {
          ws.seekTo(Math.min(initialSeekTime / dur, 1));
        }
      }
    });

    regions.on('region-created', (region) => {
      if (isProgrammaticAddRef.current) return;
      setSaveError('');
      setModalState({
        isOpen: true,
        region,
        annotationId: null,
        startTime: region.start,
        endTime: region.end,
        initialNote: '',
        initialAuthor: '',
      });
    });

    regions.on('region-clicked', (region, e: MouseEvent) => {
      e.stopPropagation();
      setSaveError('');
      const id = region.id;
      const ann = annotationsRef.current.find((a) => a.id === id);
      setModalState({
        isOpen: true,
        region,
        annotationId: id,
        startTime: region.start,
        endTime: region.end,
        initialNote: ann?.note ?? '',
        initialAuthor: ann?.author ?? '',
      });
    });

    regions.on('region-updated', (region) => {
      const id = region.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (id && isUuid) {
        fetch(`/api/annotations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: region.start,
            end_time: region.end,
          }),
        }).catch(console.error);
      }
    });

    ws.on('interaction', () => ws.play());

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsRef.current = null;
    };
  }, [audioUrl, audioId, initialSeekTime]);

  const prevAnnotationsRef = useRef<Annotation[] | null>(null);
  useEffect(() => {
    if (!isReady || !regionsRef.current) return;
    if (prevAnnotationsRef.current === annotations) return;
    const wasInitial = prevAnnotationsRef.current === null;
    prevAnnotationsRef.current = annotations;
    if (!wasInitial) {
      syncRegionsFromAnnotations(annotations);
    }
  }, [annotations, isReady, syncRegionsFromAnnotations]);

  const handleModalSave = async (note: string, author: string) => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const { region, annotationId } = modalState;

      if (annotationId) {
        const res = await fetch(`/api/annotations/${annotationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, author }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || `Save failed (${res.status})`);
          return;
        }
        region?.setContent(truncate(note, 30) || 'New note');
      } else {
        const res = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_id: audioId,
            start_time: modalState.startTime,
            end_time: modalState.endTime,
            note,
            author,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaveError(data.error || `Save failed (${res.status})`);
          return;
        }
        if (data?.id) {
          region?.setOptions({ id: data.id });
          region?.setContent(truncate(note, 30) || 'New note');
        } else {
          setSaveError('Server did not return an ID');
          return;
        }
      }

      setSaveSuccess(true);
      await new Promise((r) => setTimeout(r, 600));
      setModalState((s) => ({ ...s, isOpen: false, region: null }));
      refetchAnnotations();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSaving(false);
      setSaveSuccess(false);
    }
  };

  const handleModalClose = () => {
    if (saving || deleting) return;
    setSaveError('');
    if (!modalState.annotationId && modalState.region) {
      modalState.region.remove();
    }
    setModalState((s) => ({ ...s, isOpen: false, region: null }));
    refetchAnnotations();
  };

  const handleModalDelete = async () => {
    const { region, annotationId } = modalState;
    if (!annotationId || !region) return;

    setDeleting(true);
    setSaveError('');

    try {
      const res = await fetch(`/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || 'Failed to delete');
        return;
      }
      region.remove();
      setModalState((s) => ({ ...s, isOpen: false, region: null }));
      refetchAnnotations();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleJumpToRegion = (ann: AnnotationWithFile) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const dur = ws.getDuration();
    if (dur && dur > 0) {
      ws.seekTo(Math.min(ann.start_time / dur, 1));
      ws.play();
    }
  };

  const annotationsWithFile: AnnotationWithFile[] = annotations.map(
    (a) => ({
      ...a,
      filename: filename ?? undefined,
      slug: slug ?? undefined,
      url: slug ? `/a/${slug}?t=${a.start_time}` : undefined,
    })
  );

  const handleDeleteAll = async () => {
    if (!confirm('Delete all notes? This cannot be undone.')) return;

    setDeletingAll(true);

    try {
      const res = await fetch(`/api/annotations?audio_id=${audioId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete all notes');
        return;
      }
      regionsRef.current?.clearRegions();
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete all notes');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:gap-8 gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        <div ref={containerRef} className="min-h-[120px] bg-gray-100 dark:bg-gray-800 rounded" />
        {isReady && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => wavesurferRef.current?.playPause()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Play / Pause
            </button>
            {annotations.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                {deletingAll ? 'Deleting...' : 'Delete all notes'}
              </button>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 self-center">
              Drag on waveform to create a region • Click region to add/edit note
            </p>
          </div>
        )}
      </div>
      <aside className="lg:w-80 xl:w-96 shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Annotations
        </h3>
        <AnnotationsList
          annotations={annotationsWithFile}
          onJumpToRegion={handleJumpToRegion}
          multiFile={false}
        />
      </aside>
      <RegionNoteModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        showDelete={!!modalState.annotationId}
        deleting={deleting}
        initialNote={modalState.initialNote}
        initialAuthor={modalState.initialAuthor}
        startTime={modalState.startTime}
        endTime={modalState.endTime}
        saving={saving}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}

function truncate(s: string, len: number): string {
  return s.length <= len ? s : s.slice(0, len) + '…';
}
