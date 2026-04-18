import type { Generator, PitchPattern, RhythmSpec } from '../model/types';

interface Props {
  generator: Generator;
  onChange: (next: Generator) => void;
}

const PATTERN_OPTIONS: { kind: PitchPattern['kind']; label: string }[] = [
  { kind: 'allAtOnce', label: 'block' },
  { kind: 'cascadeInOrder', label: 'strum' },
  { kind: 'cycle', label: 'arp' },
  { kind: 'degreeSequence', label: 'seq' },
];

const RHYTHM_OPTIONS: { kind: RhythmSpec['kind']; label: string }[] = [
  { kind: 'simultaneous', label: 'sim' },
  { kind: 'cascade', label: 'cascade' },
  { kind: 'periodic', label: 'periodic' },
  { kind: 'stepGrid', label: 'grid' },
];

function changePattern(prev: Generator, kind: PitchPattern['kind']): Generator {
  if (kind === 'degreeSequence') {
    return { ...prev, pitchPattern: { kind, degrees: [0, 2, 1, 2] } };
  }
  return { ...prev, pitchPattern: { kind } as PitchPattern };
}

function changeRhythm(prev: Generator, kind: RhythmSpec['kind']): Generator {
  let rhythm: RhythmSpec;
  switch (kind) {
    case 'simultaneous':
      rhythm = { kind };
      break;
    case 'cascade':
      rhythm = { kind, offsetMs: 80 };
      break;
    case 'periodic':
      rhythm = { kind, rateBeats: 0.25 };
      break;
    case 'stepGrid':
      rhythm = { kind, resolutionBeats: 0.25, cells: [true, false, true, false, true, false, true, false] };
      break;
  }
  return { ...prev, rhythm };
}

export function GeneratorControls({ generator, onChange }: Props) {
  const { pitchPattern, rhythm } = generator;
  return (
    <section className="panel">
      <h3>Generator</h3>

      <div className="row">
        <label className="row-label">Pattern</label>
        <div className="segmented" role="radiogroup" aria-label="pitch pattern">
          {PATTERN_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={pitchPattern.kind === kind}
              className={`seg ${pitchPattern.kind === kind ? 'selected' : ''}`}
              onClick={() => onChange(changePattern(generator, kind))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pitchPattern.kind === 'degreeSequence' && (
        <DegreesEditor
          degrees={pitchPattern.degrees}
          onChange={(degrees) => onChange({ ...generator, pitchPattern: { kind: 'degreeSequence', degrees } })}
        />
      )}

      <div className="row">
        <label className="row-label">Rhythm</label>
        <div className="segmented" role="radiogroup" aria-label="rhythm">
          {RHYTHM_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={rhythm.kind === kind}
              className={`seg ${rhythm.kind === kind ? 'selected' : ''}`}
              onClick={() => onChange(changeRhythm(generator, kind))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rhythm.kind === 'cascade' && (
        <div className="row">
          <label className="row-label">Offset {rhythm.offsetMs} ms</label>
          <input
            type="range"
            min={10}
            max={400}
            step={5}
            value={rhythm.offsetMs}
            aria-label="cascade offset ms"
            onChange={(e) =>
              onChange({ ...generator, rhythm: { kind: 'cascade', offsetMs: Number(e.target.value) } })
            }
          />
        </div>
      )}

      {rhythm.kind === 'periodic' && (
        <div className="row">
          <label className="row-label">Rate {rhythm.rateBeats.toFixed(3)} beats</label>
          <input
            type="range"
            min={0.0625}
            max={1}
            step={0.0625}
            value={rhythm.rateBeats}
            aria-label="periodic rate beats"
            onChange={(e) =>
              onChange({
                ...generator,
                rhythm: { kind: 'periodic', rateBeats: Number(e.target.value) },
              })
            }
          />
        </div>
      )}

      {rhythm.kind === 'stepGrid' && (
        <StepGridEditor
          resolutionBeats={rhythm.resolutionBeats}
          cells={rhythm.cells}
          onChange={(cells, resolutionBeats) =>
            onChange({ ...generator, rhythm: { kind: 'stepGrid', resolutionBeats, cells } })
          }
        />
      )}
    </section>
  );
}

function DegreesEditor({
  degrees,
  onChange,
}: {
  degrees: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <div className="row">
      <label className="row-label">Degrees</label>
      <div className="degrees-row" aria-label="degree sequence">
        {degrees.map((d, i) => (
          <span key={i} className="chip">
            <button
              type="button"
              aria-label={`decrease degree ${i}`}
              onClick={() => onChange(degrees.map((v, j) => (j === i ? Math.max(0, v - 1) : v)))}
            >−</button>
            <span>{d}</span>
            <button
              type="button"
              aria-label={`increase degree ${i}`}
              onClick={() => onChange(degrees.map((v, j) => (j === i ? v + 1 : v)))}
            >+</button>
            <button
              type="button"
              aria-label={`remove degree ${i}`}
              className="remove"
              onClick={() => onChange(degrees.filter((_, j) => j !== i))}
            >×</button>
          </span>
        ))}
        <button
          type="button"
          className="pill"
          aria-label="add degree"
          onClick={() => onChange([...degrees, 0])}
        >
          +
        </button>
      </div>
    </div>
  );
}

function StepGridEditor({
  cells,
  resolutionBeats,
  onChange,
}: {
  cells: boolean[];
  resolutionBeats: number;
  onChange: (cells: boolean[], resolutionBeats: number) => void;
}) {
  return (
    <>
      <div className="row">
        <label className="row-label">Resolution {resolutionBeats} beats</label>
        <div className="segmented" role="radiogroup" aria-label="resolution">
          {[0.125, 0.25, 0.5].map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={resolutionBeats === r}
              className={`seg ${resolutionBeats === r ? 'selected' : ''}`}
              onClick={() => onChange(cells, r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="row-label">Cells</label>
        <div className="step-grid" aria-label="step cells">
          {cells.map((c, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={c}
              aria-label={`cell ${i}`}
              className={`step ${c ? 'on' : ''}`}
              onClick={() => onChange(cells.map((v, j) => (j === i ? !v : v)), resolutionBeats)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
