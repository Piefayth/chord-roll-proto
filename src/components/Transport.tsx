import { useEffect, useRef, useState } from 'react';
import { useDocument } from '../state/document';
import { renderDocument } from '../model/render';
import { ensureAudio, play, schedule, stop } from '../audio/engine';

export function Transport() {
  const { doc, setTempo } = useDocument();
  const [playing, setPlaying] = useState(false);
  const initRef = useRef(false);
  const lastSnap = useRef<string>('');

  // When doc changes while playing, reschedule.
  useEffect(() => {
    if (!initRef.current) return;
    const notes = renderDocument(doc);
    const loopBeats = Math.max(...doc.objects.map((o) => o.position + o.duration), 4);
    const snap = JSON.stringify({ notes, loopBeats, tempo: doc.tempo });
    if (snap === lastSnap.current) return;
    lastSnap.current = snap;
    schedule({ notes, loopBeats, bpm: doc.tempo });
  }, [doc]);

  const handlePlay = async () => {
    await ensureAudio();
    initRef.current = true;
    const notes = renderDocument(doc);
    const loopBeats = Math.max(...doc.objects.map((o) => o.position + o.duration), 4);
    schedule({ notes, loopBeats, bpm: doc.tempo });
    play();
    setPlaying(true);
  };

  const handleStop = () => {
    stop();
    setPlaying(false);
  };

  return (
    <div className="transport" data-testid="transport">
      {playing ? (
        <button type="button" onClick={handleStop} className="transport-btn stop">■ stop</button>
      ) : (
        <button type="button" onClick={handlePlay} className="transport-btn play">▶ play</button>
      )}
      <label className="tempo">
        <span>{doc.tempo} BPM</span>
        <input
          type="range"
          min={40}
          max={200}
          value={doc.tempo}
          aria-label="tempo"
          onChange={(e) => setTempo(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
