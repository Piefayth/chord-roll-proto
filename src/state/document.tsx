import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DocumentState, PitchSet, TimelineObject, Voicing } from '../model/types';
import { inferChordLabel } from '../model/chords';

const initialObject: TimelineObject = {
  id: 'obj-1',
  pitchSet: { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' },
  voicing: {
    centerNote: 60,
    bottomPitchClass: 0,
    compactness: 0,
    bassSplit: false,
    bassDistance: 1,
    octaveSpan: 1,
    range: [21, 108],
  },
  generator: {
    pitchPattern: { kind: 'allAtOnce' },
    rhythm: { kind: 'simultaneous' },
  },
  position: 0,
  duration: 4,
};

const initialDoc: DocumentState = { tempo: 120, objects: [initialObject] };

const STORAGE_KEY = 'chord-roll-doc-v1';

function loadPersistedDoc(): { doc: DocumentState; idCounter: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { doc: DocumentState; idCounter: number };
    if (!parsed || typeof parsed !== 'object' || !parsed.doc) return null;
    // Light validation: ensure required fields exist.
    if (!Array.isArray(parsed.doc.objects) || typeof parsed.doc.tempo !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

let _idCounter = 2;
function nextId(): string {
  return `obj-${_idCounter++}`;
}

export function defaultObject(position: number, duration = 4): TimelineObject {
  const pitchSet: PitchSet = { rootPC: 0, intervals: [0, 4, 7], name: inferChordLabel(0, [0, 4, 7]) };
  const voicing: Voicing = {
    centerNote: 60,
    bottomPitchClass: 0,
    compactness: 0,
    bassSplit: false,
    bassDistance: 1,
    octaveSpan: 1,
    range: [21, 108],
  };
  return {
    id: nextId(),
    pitchSet,
    voicing,
    generator: { pitchPattern: { kind: 'allAtOnce' }, rhythm: { kind: 'simultaneous' } },
    position,
    duration,
  };
}

interface DocumentCtx {
  doc: DocumentState;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<TimelineObject>) => void;
  /** Set the pitchSet of an object; resets trim counts because the source set changed. */
  updatePitchSet: (id: string, next: PitchSet) => void;
  createObject: (position: number) => string;
  removeObject: (id: string) => void;
  clearAll: () => void;
  cycleSelectAt: (beat: number, pitch: number) => void;
  setTempo: (bpm: number) => void;
  playing: boolean;
  setPlaying: (v: boolean) => void;
}

const Ctx = createContext<DocumentCtx | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(() => loadPersistedDoc(), []);
  if (persisted) _idCounter = Math.max(_idCounter, persisted.idCounter);
  const [doc, setDoc] = useState<DocumentState>(persisted?.doc ?? initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(
    persisted?.doc.objects[0]?.id ?? initialObject.id
  );
  const [playing, setPlaying] = useState(false);
  const lastCyclePoint = useRef<{ beat: number; pitch: number } | null>(null);

  // Persist on every document change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ doc, idCounter: _idCounter })
      );
    } catch {
      /* quota / privacy mode — silently ignore */
    }
  }, [doc]);

  const updateObject = useCallback((id: string, patch: Partial<TimelineObject>) => {
    setDoc((d) => ({
      ...d,
      objects: d.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  }, []);

  const updatePitchSet = useCallback((id: string, next: PitchSet) => {
    setDoc((d) => ({
      ...d,
      objects: d.objects.map((o) =>
        o.id === id ? { ...o, pitchSet: next, topTrim: 0, bottomTrim: 0 } : o
      ),
    }));
  }, []);

  const createObject = useCallback((position: number) => {
    const obj = defaultObject(Math.max(0, Math.round(position)));
    setDoc((d) => ({ ...d, objects: [...d.objects, obj] }));
    setSelectedId(obj.id);
    return obj.id;
  }, []);

  const removeObject = useCallback((id: string) => {
    setDoc((d) => ({ ...d, objects: d.objects.filter((o) => o.id !== id) }));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  const clearAll = useCallback(() => {
    setDoc({ tempo: 120, objects: [] });
    setSelectedId(null);
  }, []);

  const cycleSelectAt = useCallback((beat: number, _pitch: number) => {
    setDoc((d) => {
      const hits = d.objects.filter((o) => beat >= o.position && beat < o.position + o.duration);
      if (hits.length === 0) {
        setSelectedId(null);
        lastCyclePoint.current = null;
        return d;
      }
      const last = lastCyclePoint.current;
      const sameSpot = last && Math.abs(last.beat - beat) < 0.25;
      setSelectedId((prev) => {
        if (sameSpot && prev && hits.some((h) => h.id === prev)) {
          const idx = hits.findIndex((h) => h.id === prev);
          return hits[(idx + 1) % hits.length].id;
        }
        return hits[0].id;
      });
      lastCyclePoint.current = { beat, pitch: _pitch };
      return d;
    });
  }, []);

  const setTempo = useCallback((bpm: number) => {
    setDoc((d) => ({ ...d, tempo: bpm }));
  }, []);

  const value = useMemo(
    () => ({
      doc,
      selectedId,
      setSelectedId,
      updateObject,
      updatePitchSet,
      createObject,
      removeObject,
      clearAll,
      cycleSelectAt,
      setTempo,
      playing,
      setPlaying,
    }),
    [
      doc,
      selectedId,
      updateObject,
      updatePitchSet,
      createObject,
      removeObject,
      clearAll,
      cycleSelectAt,
      setTempo,
      playing,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocument() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDocument must be used inside <DocumentProvider>');
  return v;
}
