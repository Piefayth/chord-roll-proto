import { describe, it, expect } from 'vitest';
import { decBottomTrim, decTopTrim, effectivePitchSet, incBottomTrim, incTopTrim } from './pitchOps';
import type { TimelineObject } from './types';

const baseObj: TimelineObject = {
  id: 'x',
  pitchSet: { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' },
  voicing: {
    centerNote: 60,
    bottomPitchClass: 0,
    compactness: 0,
    bassSplit: false,
    bassDistance: 1,
    octaveSpan: 1,
    range: [21, 108],
  },
  generator: { pitchPattern: { kind: 'allAtOnce' }, rhythm: { kind: 'simultaneous' } },
  position: 0,
  duration: 4,
};

describe('effectivePitchSet', () => {
  it('is a no-op when no trim is set', () => {
    expect(effectivePitchSet(baseObj).intervals).toEqual([0, 4, 7, 11]);
  });
  it('slices topTrim off the top', () => {
    expect(effectivePitchSet({ ...baseObj, topTrim: 1 }).intervals).toEqual([0, 4, 7]);
  });
  it('slices bottomTrim off the bottom', () => {
    expect(effectivePitchSet({ ...baseObj, bottomTrim: 1 }).intervals).toEqual([4, 7, 11]);
  });
  it('re-derives the chord name from the effective intervals', () => {
    expect(effectivePitchSet({ ...baseObj, topTrim: 1 }).name).toBe('Cmaj');
  });
  it('keeps at least one note when both trims are extreme', () => {
    const e = effectivePitchSet({ ...baseObj, topTrim: 10, bottomTrim: 10 });
    expect(e.intervals.length).toBeGreaterThanOrEqual(1);
  });
});

describe('incTopTrim / decTopTrim', () => {
  it('increments the top trim count', () => {
    expect(incTopTrim(baseObj).topTrim).toBe(1);
  });
  it('refuses to trim past one remaining note', () => {
    const obj = { ...baseObj, topTrim: 3 }; // 4 intervals, 3 trimmed, 1 remains
    expect(incTopTrim(obj).topTrim).toBe(3); // no-op
  });
  it('decrement does not go below zero', () => {
    expect(decTopTrim(baseObj).topTrim ?? 0).toBe(0);
    expect(decTopTrim({ ...baseObj, topTrim: 2 }).topTrim).toBe(1);
  });
});

describe('incBottomTrim / decBottomTrim', () => {
  it('increments the bottom trim count', () => {
    expect(incBottomTrim(baseObj).bottomTrim).toBe(1);
  });
  it('refuses to trim past one remaining note', () => {
    const obj = { ...baseObj, bottomTrim: 2, topTrim: 1 };
    expect(incBottomTrim(obj).bottomTrim).toBe(2); // no-op
  });
  it('decrement does not go below zero', () => {
    expect(decBottomTrim(baseObj).bottomTrim ?? 0).toBe(0);
    expect(decBottomTrim({ ...baseObj, bottomTrim: 2 }).bottomTrim).toBe(1);
  });
});

describe('round-trip', () => {
  it('trim then untrim restores the original effective intervals', () => {
    const trimmed = incTopTrim(incTopTrim(baseObj));
    const restored = decTopTrim(decTopTrim(trimmed));
    expect(effectivePitchSet(restored).intervals).toEqual([0, 4, 7, 11]);
  });
});
