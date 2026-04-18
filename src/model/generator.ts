import type { Generator, RhythmSpec, PitchPattern } from './types';

// Internal event before being stamped with absolute position.
interface RawEvent {
  pitch: number;
  onset: number; // beats from object start
  duration: number;
  velocity: number;
}

const DEFAULT_VELOCITY = 0.8;

// Produce onsets in beats for a given rhythm and target duration.
// `pitchCount` is used by `cascade` to know how many onsets to emit.
function rhythmOnsets(rhythm: RhythmSpec, durationBeats: number, msPerBeat: number, pitchCount: number): number[] {
  switch (rhythm.kind) {
    case 'simultaneous':
      return [0];
    case 'cascade': {
      const offBeats = rhythm.offsetMs / msPerBeat;
      const out: number[] = [];
      for (let i = 0; i < pitchCount; i++) out.push(i * offBeats);
      return out;
    }
    case 'periodic': {
      const out: number[] = [];
      const rate = Math.max(1e-6, rhythm.rateBeats);
      for (let t = 0; t < durationBeats - 1e-9; t += rate) out.push(t);
      return out;
    }
    case 'stepGrid': {
      const res = Math.max(1e-6, rhythm.resolutionBeats);
      const cells = rhythm.cells;
      const out: number[] = [];
      let cellIndex = 0;
      while (cellIndex * res < durationBeats - 1e-9) {
        if (cells[cellIndex % cells.length]) out.push(cellIndex * res);
        cellIndex++;
      }
      return out;
    }
  }
}

// Pick pitches according to the pattern, given the number of events to fill.
function patternPitches(pattern: PitchPattern, pitches: number[], eventCount: number): number[] {
  if (pitches.length === 0) return [];
  switch (pattern.kind) {
    case 'allAtOnce':
      // One pitch per pitch in the voicing; not driven by eventCount.
      return [...pitches];
    case 'cascadeInOrder':
      return [...pitches];
    case 'cycle': {
      const out: number[] = [];
      for (let i = 0; i < eventCount; i++) out.push(pitches[i % pitches.length]);
      return out;
    }
    case 'degreeSequence': {
      const degrees = pattern.degrees;
      const out: number[] = [];
      if (degrees.length === 0) return out;
      for (let i = 0; i < eventCount; i++) {
        const d = degrees[i % degrees.length];
        const idx = ((d % pitches.length) + pitches.length) % pitches.length;
        out.push(pitches[idx]);
      }
      return out;
    }
  }
}

export function applyGenerator(
  generator: Generator,
  pitches: number[],
  durationBeats: number,
  bpm: number
): RawEvent[] {
  if (pitches.length === 0) return [];
  const msPerBeat = 60_000 / bpm;
  const { pitchPattern, rhythm } = generator;

  // For block + simultaneous => one chord at t=0.
  // For strum (cascadeInOrder + cascade) => zip pitches with cascade onsets.
  // For sequence patterns (cycle/degreeSequence) => one event per rhythm onset.
  let onsets: number[];
  let pitchSeq: number[];

  if (pitchPattern.kind === 'allAtOnce' && rhythm.kind === 'simultaneous') {
    onsets = pitches.map(() => 0);
    pitchSeq = [...pitches];
  } else if (pitchPattern.kind === 'cascadeInOrder') {
    // Use rhythm to space the cascade. cascade's offsetMs drives spacing; otherwise use first onsets.
    const baseOnsets = rhythmOnsets(rhythm, durationBeats, msPerBeat, pitches.length);
    onsets = pitches.map((_, i) => baseOnsets[i] ?? baseOnsets[baseOnsets.length - 1] ?? 0);
    pitchSeq = [...pitches];
  } else if (pitchPattern.kind === 'allAtOnce') {
    // Block, but rhythm wants to repeat the chord (e.g. periodic / stepGrid): re-strike whole chord.
    const baseOnsets = rhythmOnsets(rhythm, durationBeats, msPerBeat, pitches.length);
    onsets = [];
    pitchSeq = [];
    for (const t of baseOnsets) {
      for (const p of pitches) {
        onsets.push(t);
        pitchSeq.push(p);
      }
    }
  } else {
    // cycle / degreeSequence
    const baseOnsets = rhythmOnsets(rhythm, durationBeats, msPerBeat, pitches.length);
    pitchSeq = patternPitches(pitchPattern, pitches, baseOnsets.length);
    onsets = baseOnsets.slice(0, pitchSeq.length);
  }

  // Compute per-event duration: gap to next onset, capped to a sensible default; fall back for last event.
  const events: RawEvent[] = [];
  // Group by onset to compute "next onset" per index that's strictly greater.
  const sortedUniqueOnsets = Array.from(new Set(onsets)).sort((a, b) => a - b);
  for (let i = 0; i < onsets.length; i++) {
    const t = onsets[i];
    const nextIdx = sortedUniqueOnsets.findIndex((u) => u > t + 1e-9);
    const nextOnset = nextIdx >= 0 ? sortedUniqueOnsets[nextIdx] : durationBeats;
    const gap = Math.max(0.05, nextOnset - t);
    const dur = Math.min(gap * 0.95, 1);
    events.push({
      pitch: pitchSeq[i],
      onset: t,
      duration: dur,
      velocity: DEFAULT_VELOCITY,
    });
  }
  // Drop any events whose onset is past the object's duration.
  return events.filter((e) => e.onset < durationBeats - 1e-9);
}
