import { describe, it, expect } from 'vitest';
import { applyGenerator } from './generator';
import type { Generator } from './types';

const BPM = 120;
const pitches = [60, 64, 67, 71]; // Cmaj7 close voicing

describe('applyGenerator', () => {
  it('block + simultaneous: one event per pitch at t=0', () => {
    const g: Generator = {
      pitchPattern: { kind: 'allAtOnce' },
      rhythm: { kind: 'simultaneous' },
    };
    const events = applyGenerator(g, pitches, 4, BPM);
    expect(events.map((e) => [e.pitch, e.onset])).toEqual([
      [60, 0],
      [64, 0],
      [67, 0],
      [71, 0],
    ]);
  });

  it('cascadeInOrder + cascade(offsetMs): strum, ascending pitch order, even spacing', () => {
    const g: Generator = {
      pitchPattern: { kind: 'cascadeInOrder' },
      rhythm: { kind: 'cascade', offsetMs: 250 }, // at 120bpm, 500ms/beat -> 0.5 beats
    };
    const events = applyGenerator(g, pitches, 4, BPM);
    expect(events.length).toBe(4);
    expect(events.map((e) => e.pitch)).toEqual([60, 64, 67, 71]);
    // 250ms at 120 BPM = 0.5 beats
    expect(events.map((e) => +e.onset.toFixed(4))).toEqual([0, 0.5, 1, 1.5]);
  });

  it('cycle + periodic: emits one event per onset, wrapping pitches', () => {
    const g: Generator = {
      pitchPattern: { kind: 'cycle' },
      rhythm: { kind: 'periodic', rateBeats: 0.25 },
    };
    const events = applyGenerator(g, pitches, 2, BPM);
    // 8 onsets (0, .25, .5, .75, 1, 1.25, 1.5, 1.75) cycling 60,64,67,71,60,64,67,71
    expect(events.length).toBe(8);
    expect(events.map((e) => e.pitch)).toEqual([60, 64, 67, 71, 60, 64, 67, 71]);
  });

  it('degreeSequence Alberti pattern [0,2,1,2] + periodic 0.25', () => {
    const g: Generator = {
      pitchPattern: { kind: 'degreeSequence', degrees: [0, 2, 1, 2] },
      rhythm: { kind: 'periodic', rateBeats: 0.25 },
    };
    const events = applyGenerator(g, pitches, 1, BPM);
    expect(events.map((e) => e.pitch)).toEqual([60, 67, 64, 67]);
  });

  it('block + periodic re-strikes the whole chord at each onset', () => {
    const g: Generator = {
      pitchPattern: { kind: 'allAtOnce' },
      rhythm: { kind: 'periodic', rateBeats: 1 },
    };
    const events = applyGenerator(g, pitches, 2, BPM);
    expect(events.length).toBe(8); // 2 onsets x 4 pitches
    const onsets = Array.from(new Set(events.map((e) => e.onset))).sort();
    expect(onsets).toEqual([0, 1]);
  });

  it('stepGrid only emits events on truthy cells', () => {
    const g: Generator = {
      pitchPattern: { kind: 'cycle' },
      rhythm: { kind: 'stepGrid', resolutionBeats: 0.25, cells: [true, false, true, false] },
    };
    const events = applyGenerator(g, pitches, 1, BPM);
    expect(events.map((e) => e.onset)).toEqual([0, 0.5]);
  });

  it('drops events past durationBeats', () => {
    const g: Generator = {
      pitchPattern: { kind: 'cycle' },
      rhythm: { kind: 'periodic', rateBeats: 1 },
    };
    const events = applyGenerator(g, pitches, 1.5, BPM);
    expect(events.length).toBe(2);
    expect(events.map((e) => e.onset)).toEqual([0, 1]);
  });

  it('returns empty when no pitches', () => {
    const g: Generator = {
      pitchPattern: { kind: 'allAtOnce' },
      rhythm: { kind: 'simultaneous' },
    };
    expect(applyGenerator(g, [], 4, BPM)).toEqual([]);
  });
});
