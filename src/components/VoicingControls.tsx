import type { PitchSet, Voicing } from '../model/types';
import { pcName } from '../model/chords';

interface Props {
  pitchSet: PitchSet;
  voicing: Voicing;
  generatorIsSequence: boolean; // gates octaveSpan
  onChange: (next: Voicing) => void;
}

export function VoicingControls({ pitchSet, voicing, generatorIsSequence, onChange }: Props) {
  const tones = [...new Set(pitchSet.intervals.map((iv) => ((pitchSet.rootPC + iv) % 12 + 12) % 12))];

  return (
    <section className="panel">
      <h3>Voicing</h3>

      <p className="hint">Drag the object vertically on the roll to shift register.</p>

      <div className="row">
        <label className="row-label">Bottom</label>
        <div className="pill-row" aria-label="bottom pitch class">
          {tones.map((pc) => (
            <button
              key={pc}
              type="button"
              aria-pressed={pc === voicing.bottomPitchClass}
              className={`pill ${pc === voicing.bottomPitchClass ? 'selected' : ''}`}
              onClick={() => onChange({ ...voicing, bottomPitchClass: pc })}
            >
              {pcName(pc)}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <label className="row-label">Compactness {voicing.compactness.toFixed(2)}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={voicing.compactness}
          aria-label="compactness"
          onChange={(e) => onChange({ ...voicing, compactness: Number(e.target.value) })}
        />
      </div>

      <div className="row">
        <label className="row-label">Bass split</label>
        <button
          type="button"
          aria-pressed={voicing.bassSplit}
          className={`toggle ${voicing.bassSplit ? 'on' : 'off'}`}
          onClick={() => onChange({ ...voicing, bassSplit: !voicing.bassSplit })}
        >
          {voicing.bassSplit ? 'on' : 'off'}
        </button>
      </div>

      {voicing.bassSplit && (
        <div className="row">
          <label className="row-label">Bass distance {voicing.bassDistance} oct</label>
          <div className="stepper">
            <button
              type="button"
              aria-label="decrease bass distance"
              onClick={() => onChange({ ...voicing, bassDistance: Math.max(1, voicing.bassDistance - 1) })}
            >−</button>
            <span className="value">{voicing.bassDistance}</span>
            <button
              type="button"
              aria-label="increase bass distance"
              onClick={() => onChange({ ...voicing, bassDistance: Math.min(3, voicing.bassDistance + 1) })}
            >+</button>
          </div>
        </div>
      )}

      {generatorIsSequence && (
        <div className="row">
          <label className="row-label">Octave span {voicing.octaveSpan}</label>
          <div className="stepper">
            <button
              type="button"
              aria-label="decrease octave span"
              onClick={() => onChange({ ...voicing, octaveSpan: Math.max(1, voicing.octaveSpan - 1) })}
            >−</button>
            <span className="value">{voicing.octaveSpan}</span>
            <button
              type="button"
              aria-label="increase octave span"
              onClick={() => onChange({ ...voicing, octaveSpan: Math.min(4, voicing.octaveSpan + 1) })}
            >+</button>
          </div>
        </div>
      )}
    </section>
  );
}
