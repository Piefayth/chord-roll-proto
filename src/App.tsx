import { useRef } from 'react';
import './App.css';
import { DocumentProvider, useDocument } from './state/document';
import { PianoRoll, applyPitchSetEdit } from './components/PianoRoll';
import { Inspector } from './components/Inspector';
import { Transport } from './components/Transport';
import { usePlayhead } from './hooks/usePlayhead';

function Stage() {
  const { doc, selectedId, setSelectedId, updateObject, createObject, cycleSelectAt, playing } = useDocument();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loopBeats = Math.max(...doc.objects.map((o) => o.position + o.duration), 4);
  const currentBeat = usePlayhead(loopBeats, playing);
  const totalBeats = Math.max(16, Math.ceil(loopBeats / 4) * 4 + 4);
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
            onUpdatePitchSet={(id, direction) => {
              const obj = doc.objects.find((o) => o.id === id);
              if (!obj) return;
              const next = applyPitchSetEdit(obj, direction);
              updateObject(id, { pitchSet: next.pitchSet });
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
