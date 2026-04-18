import type { Generator, PitchPattern, RhythmSpec } from '../model/types';

interface Props {
  generator: Generator;
  voiceCount: number; // sizes the degree grid; 0 means "use a sensible default"
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

const DEGREE_PRESETS: { label: string; build: (n: number) => number[] }[] = [
  { label: 'Alberti', build: (n) => [0, n - 1, Math.floor(n / 2), n - 1] },
  { label: 'up', build: (n) => Array.from({ length: n }, (_, i) => i) },
  { label: 'down', build: (n) => Array.from({ length: n }, (_, i) => n - 1 - i) },
  {
    label: 'up-down',
    build: (n) => {
      const up = Array.from({ length: n }, (_, i) => i);
      const down = Array.from({ length: n - 2 }, (_, i) => n - 2 - i);
      return [...up, ...down];
    },
  },
  { label: 'zigzag', build: (n) => (n >= 3 ? [0, 2, 1, n - 1] : [0, 1, 0, 1]) },
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

export function GeneratorControls({ generator, voiceCount, onChange }: Props) {
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
          voiceCount={Math.max(2, voiceCount || 4)}
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
  voiceCount,
  onChange,
}: {
  degrees: number[];
  voiceCount: number;
  onChange: (next: number[]) => void;
}) {
  const rows = Math.max(voiceCount, Math.max(0, ...degrees) + 1);
  const setStep = (step: number, voice: number) => {
    const next = [...degrees];
    next[step] = voice;
    onChange(next);
  };
  const setLength = (len: number) => {
    if (len < 1) return;
    if (len === degrees.length) return;
    if (len < degrees.length) return onChange(degrees.slice(0, len));
    const extra = Array.from({ length: len - degrees.length }, () => 0);
    onChange([...degrees, ...extra]);
  };
  return (
    <>
      <div className="row">
        <label className="row-label">Presets</label>
        <div className="pill-row">
          {DEGREE_PRESETS.map(({ label, build }) => (
            <button
              key={label}
              type="button"
              className="pill"
              onClick={() => onChange(build(voiceCount))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="row-label">Length {degrees.length}</label>
        <div className="stepper">
          <button
            type="button"
            aria-label="shorter sequence"
            onClick={() => setLength(degrees.length - 1)}
          >−</button>
          <span className="value">{degrees.length}</span>
          <button
            type="button"
            aria-label="longer sequence"
            onClick={() => setLength(degrees.length + 1)}
          >+</button>
        </div>
      </div>
      <div className="row">
        <label className="row-label">Sequence</label>
        <div
          className="degree-grid"
          aria-label="degree grid"
          style={{ gridTemplateColumns: `repeat(${degrees.length}, minmax(28px, 1fr))`, gridTemplateRows: `repeat(${rows}, 28px)` }}
        >
          {/* top row = highest voice index so grid reads like a pitch grid */}
          {Array.from({ length: rows }).map((_, r) => {
            const voiceIdx = rows - 1 - r;
            return degrees.map((d, step) => {
              const active = d === voiceIdx;
              return (
                <button
                  key={`${r}-${step}`}
                  type="button"
                  className={`degree-cell ${active ? 'on' : ''}`}
                  aria-pressed={active}
                  aria-label={`step ${step} voice ${voiceIdx}`}
                  onClick={() => setStep(step, voiceIdx)}
                >
                  {active ? voiceIdx : ''}
                </button>
              );
            });
          })}
        </div>
      </div>
    </>
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
