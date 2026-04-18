import './App.css';
import { DocumentProvider, useDocument } from './state/document';
import { PianoRoll } from './components/PianoRoll';
import { Inspector } from './components/Inspector';
import { Transport } from './components/Transport';

function Stage() {
  const { doc, selectedId, setSelectedId } = useDocument();
  return (
    <div className="app">
      <header className="topbar">
        <div className="title">Chord Roll</div>
        <Transport />
      </header>
      <main className="stage">
        <div className="roll-scroll">
          <PianoRoll doc={doc} selectedId={selectedId} onSelect={setSelectedId} totalBeats={8} />
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
