import type { PitchSet } from './types';

export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function pcName(pc: number): string {
  return PITCH_CLASS_NAMES[((pc % 12) + 12) % 12];
}

// Standard interval shapes used as starting points in the chord picker.
export const CHORD_SHAPES: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  alt7: [0, 4, 7, 10, 13, 15, 18], // dom7 + b9 + #9 + #11
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  dom9: [0, 4, 7, 10, 14],
  maj11: [0, 4, 7, 11, 14, 17],
  min11: [0, 3, 7, 10, 14, 17],
  maj13: [0, 4, 7, 11, 14, 21],
  min13: [0, 3, 7, 10, 14, 21],
};

// Scales: full pitch collections for melodic / walking-bass usage with
// degreeSequence and cycle generators. Same model (a PitchSet); presented
// separately in the inspector so users don't conflate them with chords.
export const SCALE_SHAPES: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11], // major
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], // natural minor
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMin: [0, 2, 3, 5, 7, 8, 11],
  melodicMin: [0, 2, 3, 5, 7, 9, 11],
  pentMaj: [0, 2, 4, 7, 9],
  pentMin: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

export function makePitchSet(rootPC: number, intervals: number[], name: string): PitchSet {
  return {
    rootPC: ((rootPC % 12) + 12) % 12,
    intervals: [...intervals],
    name,
  };
}

// Optional intervals, in canonical top-down removal order (highest-valued first).
// When a user drags the top edge down, we strip from the start of this list.
// Adds go in reverse.
export interface ExtensionSpec {
  interval: number;
  label: string;
}

export const EXTENSIONS: ExtensionSpec[] = [
  { interval: 21, label: '13' },
  { interval: 20, label: '♭13' },
  { interval: 18, label: '#11' },
  { interval: 17, label: '11' },
  { interval: 15, label: '#9' },
  { interval: 14, label: '9' },
  { interval: 13, label: '♭9' },
  { interval: 11, label: 'maj7' },
  { interval: 10, label: '♭7' },
  { interval: 9, label: '6' },
  { interval: 6, label: '♭5' },
];

// Common label given a sorted list of intervals.
export function inferChordLabel(rootPC: number, intervals: number[]): string {
  const sorted = [...new Set(intervals)].sort((a, b) => a - b);
  const root = pcName(rootPC);
  const key = JSON.stringify(sorted);
  const known: Record<string, string> = {
    [JSON.stringify([0, 4, 7])]: 'maj',
    [JSON.stringify([0, 3, 7])]: 'm',
    [JSON.stringify([0, 4, 7, 11])]: 'maj7',
    [JSON.stringify([0, 4, 7, 10])]: '7',
    [JSON.stringify([0, 3, 7, 10])]: 'm7',
    [JSON.stringify([0, 3, 6, 10])]: 'm7♭5',
    [JSON.stringify([0, 3, 6, 9])]: 'dim7',
    [JSON.stringify([0, 5, 7])]: 'sus4',
    [JSON.stringify([0, 2, 7])]: 'sus2',
    [JSON.stringify([0, 4, 7, 10, 14])]: '9',
    [JSON.stringify([0, 4, 7, 11, 14])]: 'maj9',
    [JSON.stringify([0, 3, 7, 10, 14])]: 'm9',
    [JSON.stringify([0, 4, 7, 10, 13])]: '7♭9',
    [JSON.stringify([0, 4, 7, 10, 15])]: '7#9',
    [JSON.stringify([0, 4, 7, 10, 14, 18])]: '9#11',
    [JSON.stringify([0, 4, 7, 10, 14, 21])]: '13',
    [JSON.stringify([0, 4, 7, 11, 14, 17])]: 'maj11',
    [JSON.stringify([0, 4, 7, 11, 14, 21])]: 'maj13',
    [JSON.stringify([0, 3, 7, 10, 14, 17])]: 'm11',
    [JSON.stringify([0, 3, 7, 10, 14, 21])]: 'm13',
    [JSON.stringify([4, 7])]: 'maj(no root)',
    [JSON.stringify([4, 7, 11])]: 'maj7(no root)',
  };
  const suffix = known[key] ?? `(${sorted.join(',')})`;
  return `${root}${suffix}`;
}
