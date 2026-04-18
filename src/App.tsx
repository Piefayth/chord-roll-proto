import { useEffect, useRef } from 'react';
import './App.css';
import { DocumentProvider, useDocument } from './state/document';
import { PianoRoll, applyTrim } from './components/PianoRoll';
import { Inspector } from './components/Inspector';
import { Transport } from './components/Transport';
import { usePlayhead } from './hooks/usePlayhead';

function Stage() {
  const {
    doc,
    selectedId,
    setSelectedId,
    updateObject,
    createObject,
    cycleSelectAt,
    playing,
    copySelected,
    paste,
    removeObject,
  } = useDocument();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loopBeats = Math.max(...doc.objects.map((o) => o.position + o.duration), 4);
  const currentBeat = usePlayhead(loopBeats, playing);
  const totalBeats = Math.max(16, Math.ceil(loopBeats / 4) * 4 + 4);

  // Keyboard shortcuts: Cmd/Ctrl+C copy, Cmd/Ctrl+V paste, Escape deselect,
  // Delete/Backspace remove. Ignored when focus is in an input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'c') {
        copySelected();
        e.preventDefault();
      } else if (meta && e.key.toLowerCase() === 'v') {
        paste();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeObject(selectedId);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copySelected, paste, removeObject, selectedId, setSelectedId]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">Chord Roll</div>
        <Transport />
      </header>
      <main className="stage">
        <div className="roll-scroll" ref={scrollRef}>
          <PianoRoll
            doc={doc}
            selectedId={selectedId}
            currentBeat={playing ? currentBeat : -1}
            totalBeats={totalBeats}
            scrollRef={scrollRef}
            onSelect={setSelectedId}
            onCycleSelectAt={cycleSelectAt}
            onCreate={(beat) => createObject(beat)}
            onUpdate={(id, patch) => updateObject(id, patch)}
            onTrim={(id, direction) => {
              const obj = doc.objects.find((o) => o.id === id);
              if (!obj) return;
              const next = applyTrim(obj, direction);
              updateObject(id, { topTrim: next.topTrim, bottomTrim: next.bottomTrim });
            }}
          />
        </div>
        <Inspector />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DocumentProvider>
      <Stage />
    </DocumentProvider>
  );
}
