import type { PitchSet } from '../model/types';
import { CHORD_SHAPES, EXTENSIONS, PITCH_CLASS_NAMES, inferChordLabel, pcName } from '../model/chords';

interface Props {
  pitchSet: PitchSet;
  onChange: (next: PitchSet) => void;
}

const SHAPE_LABELS: { key: keyof typeof CHORD_SHAPES; label: string }[] = [
  { key: 'maj', label: 'maj' },
  { key: 'min', label: 'm' },
  { key: 'maj7', label: 'maj7' },
  { key: 'dom7', label: '7' },
  { key: 'min7', label: 'm7' },
  { key: 'm7b5', label: 'm7♭5' },
  { key: 'dim7', label: 'dim7' },
  { key: 'sus4', label: 'sus4' },
  { key: 'sus2', label: 'sus2' },
  { key: 'maj9', label: 'maj9' },
  { key: 'dom9', label: '9' },
  { key: 'min9', label: 'm9' },
  { key: 'alt7', label: 'alt' },
  { key: 'maj13', label: 'maj13' },
  { key: 'min13', label: 'm13' },
  { key: 'dorianScale', label: 'dor' },
];

export function ChordPicker({ pitchSet, onChange }: Props) {
  const setRoot = (rootPC: number) => {
    onChange({ ...pitchSet, rootPC, name: inferChordLabel(rootPC, pitchSet.intervals) });
  };
  const applyShape = (shapeKey: keyof typeof CHORD_SHAPES) => {
    const intervals = [...CHORD_SHAPES[shapeKey]];
    onChange({ ...pitchSet, intervals, name: inferChordLabel(pitchSet.rootPC, intervals) });
  };
  const toggleInterval = (iv: number) => {
    const has = pitchSet.intervals.includes(iv);
    const intervals = has
      ? pitchSet.intervals.filter((x) => x !== iv)
      : [...pitchSet.intervals, iv].sort((a, b) => a - b);
    onChange({ ...pitchSet, intervals, name: inferChordLabel(pitchSet.rootPC, intervals) });
  };
  return (
    <section className="panel">
      <h3>Chord <span className="chord-name">{pitchSet.name}</span></h3>
      <div className="row">
        <label className="row-label">Root</label>
        <div className="pill-row" role="radiogroup" aria-label="root pitch class">
          {PITCH_CLASS_NAMES.map((n, i) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={i === pitchSet.rootPC}
              className={`pill ${i === pitchSet.rootPC ? 'selected' : ''}`}
              onClick={() => setRoot(i)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="row-label">Shape</label>
        <div className="pill-row">
          {SHAPE_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="pill"
              onClick={() => applyShape(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="row-label">Extensions</label>
        <div className="pill-row">
          {EXTENSIONS.map(({ interval, label }) => {
            const active = pitchSet.intervals.includes(interval);
            return (
              <button
                key={interval}
                type="button"
                aria-pressed={active}
                className={`pill ${active ? 'selected' : ''}`}
                onClick={() => toggleInterval(interval)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row">
        <label className="row-label">Tones</label>
        <div className="pill-row tones-display" aria-label="current tones">
          {[...new Set(pitchSet.intervals)].sort((a, b) => a - b).map((iv) => (
            <span key={iv} className="tone">
              {pcName(pitchSet.rootPC + iv)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
