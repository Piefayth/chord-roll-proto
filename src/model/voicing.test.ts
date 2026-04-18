import { describe, it, expect } from 'vitest';
import { resolveVoicing } from './voicing';
import type { PitchSet, Voicing } from './types';

const Cmaj7: PitchSet = { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' };

const baseVoicing: Voicing = {
  centerNote: 60,
  bottomPitchClass: 0,
  compactness: 0,
  bassSplit: false,
  bassDistance: 1,
  octaveSpan: 1,
  range: [21, 108],
};

describe('resolveVoicing', () => {
  it('produces a close-voiced Cmaj7 starting at C4 (MIDI 60)', () => {
    expect(resolveVoicing(Cmaj7, baseVoicing)).toEqual([60, 64, 67, 71]);
  });

  it('rotates so bottomPitchClass is at the bottom (E in bass)', () => {
    const v = { ...baseVoicing, bottomPitchClass: 4 };
    // E4=64, G4=67, B4=71, C5=72
    expect(resolveVoicing(Cmaj7, v)).toEqual([64, 67, 71, 72]);
  });

  it('falls back to root when bottomPitchClass is not in the set', () => {
    const v = { ...baseVoicing, bottomPitchClass: 1 }; // C# not in Cmaj7
    expect(resolveVoicing(Cmaj7, v)).toEqual([60, 64, 67, 71]);
  });

  it('compactness raises voices progressively from the top (N=3 upper voices, threshold i/(N+1))', () => {
    // Cmaj7: [60,64,67,71]. 3 upper voices. Thresholds: 0.25, 0.5, 0.75.
    // At cmp=0.1: no change.
    expect(resolveVoicing(Cmaj7, { ...baseVoicing, compactness: 0.1 })).toEqual([60, 64, 67, 71]);
    // At cmp=0.3: only top raised: 71 -> 83. -> [60, 64, 67, 83]
    expect(resolveVoicing(Cmaj7, { ...baseVoicing, compactness: 0.3 })).toEqual([60, 64, 67, 83]);
    // At cmp=0.6: top + 2nd raised: 71->83, 67->79.
    expect(resolveVoicing(Cmaj7, { ...baseVoicing, compactness: 0.6 })).toEqual([60, 64, 79, 83]);
    // At cmp=0.8: top + 2nd + 3rd raised: 71->83, 67->79, 64->76.
    expect(resolveVoicing(Cmaj7, { ...baseVoicing, compactness: 0.8 })).toEqual([60, 76, 79, 83]);
  });

  it('bassSplit duplicates the lowest pitch one octave below', () => {
    const v = { ...baseVoicing, bassSplit: true, bassDistance: 1 };
    expect(resolveVoicing(Cmaj7, v)).toEqual([48, 60, 64, 67, 71]);
  });

  it('bassSplit at 2 octaves below', () => {
    const v = { ...baseVoicing, bassSplit: true, bassDistance: 2 };
    expect(resolveVoicing(Cmaj7, v)).toEqual([36, 60, 64, 67, 71]);
  });

  it('octaveSpan duplicates the cluster up an octave', () => {
    const v = { ...baseVoicing, octaveSpan: 2 };
    expect(resolveVoicing(Cmaj7, v)).toEqual([60, 64, 67, 71, 72, 76, 79, 83]);
  });

  it('clamps pitches outside the range', () => {
    const v = { ...baseVoicing, range: [60, 70] as [number, number] };
    expect(resolveVoicing(Cmaj7, v)).toEqual([60, 64, 67]);
  });

  it('handles empty intervals', () => {
    const empty: PitchSet = { rootPC: 0, intervals: [], name: '' };
    expect(resolveVoicing(empty, baseVoicing)).toEqual([]);
  });

  it('handles non-zero rootPC (G major)', () => {
    const G: PitchSet = { rootPC: 7, intervals: [0, 4, 7], name: 'G' };
    const v = { ...baseVoicing, bottomPitchClass: 7 };
    // Pitch classes: G(7), B(11), D(2). Bottom near 60 (C4):
    // G3=55, B3=59, D4=62
    expect(resolveVoicing(G, v)).toEqual([55, 59, 62]);
  });
});
