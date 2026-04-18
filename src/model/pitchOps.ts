import type { PitchSet } from './types';
import { inferChordLabel } from './chords';

// Canonical pool of intervals we'll consider when adding back a voice.
// Covers triad tones, color tones, and common alterations/extensions.
const CANONICAL_POOL = [0, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21];

function withIntervals(pitchSet: PitchSet, intervals: number[]): PitchSet {
  const next = [...new Set(intervals)].sort((a, b) => a - b);
  return { ...pitchSet, intervals: next, name: inferChordLabel(pitchSet.rootPC, next) };
}

// Drop the highest interval from the set. No-op if only root remains.
export function removeTop(pitchSet: PitchSet): PitchSet {
  const ivs = [...pitchSet.intervals].sort((a, b) => a - b);
  if (ivs.length <= 1) return pitchSet;
  ivs.pop();
  return withIntervals(pitchSet, ivs);
}

// Add the next interval above the current max from the canonical pool.
// If the set already contains all pool items up through the top, no-op.
export function addTop(pitchSet: PitchSet): PitchSet {
  const ivs = [...pitchSet.intervals].sort((a, b) => a - b);
  const max = ivs.length ? ivs[ivs.length - 1] : -1;
  const next = CANONICAL_POOL.find((iv) => iv > max && !ivs.includes(iv));
  if (next === undefined) return pitchSet;
  return withIntervals(pitchSet, [...ivs, next]);
}

// Drop the lowest interval (rootless voicing when it's the root).
export function removeBottom(pitchSet: PitchSet): PitchSet {
  const ivs = [...pitchSet.intervals].sort((a, b) => a - b);
  if (ivs.length <= 1) return pitchSet;
  ivs.shift();
  return withIntervals(pitchSet, ivs);
}

// Re-add the root (interval 0) if it's missing. No-op otherwise.
export function addBottom(pitchSet: PitchSet): PitchSet {
  if (pitchSet.intervals.includes(0)) return pitchSet;
  return withIntervals(pitchSet, [...pitchSet.intervals, 0]);
}
