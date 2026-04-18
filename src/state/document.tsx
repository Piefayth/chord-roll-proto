import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DocumentState, TimelineObject } from '../model/types';

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

interface DocumentCtx {
  doc: DocumentState;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<TimelineObject>) => void;
  setTempo: (bpm: number) => void;
}

const Ctx = createContext<DocumentCtx | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<DocumentState>(initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(initialObject.id);

  const updateObject = useCallback((id: string, patch: Partial<TimelineObject>) => {
    setDoc((d) => ({
      ...d,
      objects: d.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  }, []);

  const setTempo = useCallback((bpm: number) => {
    setDoc((d) => ({ ...d, tempo: bpm }));
  }, []);

  const value = useMemo(
    () => ({ doc, selectedId, setSelectedId, updateObject, setTempo }),
    [doc, selectedId, updateObject, setTempo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocument() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDocument must be used inside <DocumentProvider>');
  return v;
}
