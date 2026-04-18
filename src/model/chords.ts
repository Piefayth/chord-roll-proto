import type { PitchSet } from './types';

export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function pcName(pc: number): string {
  return PITCH_CLASS_NAMES[((pc % 12) + 12) % 12];
}

// Standard interval shapes used as starting points in the chord picker.
// Each value is a list of semitone offsets from the root, including 0 (the root).
export const CHORD_SHAPES: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7],
  // Dorian-friendly scale to support walking-bass demos.
  dorianScale: [0, 2, 3, 5, 7, 9, 10],
};

export function makePitchSet(rootPC: number, intervals: number[], name: string): PitchSet {
  return {
    rootPC: ((rootPC % 12) + 12) % 12,
    intervals: [...intervals],
    name,
  };
}

// Optional intervals beyond the triad, in canonical removal/add order from top.
export const EXTENSION_INTERVALS = [11, 14, 17, 21] as const; // 7, 9, 11, 13 (compound)

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
    [JSON.stringify([0, 3, 6, 10])]: 'm7b5',
    [JSON.stringify([0, 3, 6, 9])]: 'dim7',
    [JSON.stringify([0, 5, 7])]: 'sus4',
    [JSON.stringify([0, 4, 7, 10, 14])]: '9',
    [JSON.stringify([0, 4, 7, 11, 14])]: 'maj9',
    [JSON.stringify([0, 3, 7, 10, 14])]: 'm9',
    [JSON.stringify([4, 7])]: 'maj(no root)',
    [JSON.stringify([4, 7, 11])]: 'maj7(no root)',
  };
  const suffix = known[key] ?? `(${sorted.join(',')})`;
  return `${root}${suffix}`;
}
