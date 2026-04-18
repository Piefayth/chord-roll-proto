import { describe, it, expect } from 'vitest';
import { addBottom, addTop, removeBottom, removeTop } from './pitchOps';
import type { PitchSet } from './types';

const Cmaj7: PitchSet = { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' };
const C9: PitchSet = { rootPC: 0, intervals: [0, 4, 7, 10, 14], name: 'C9' };

describe('pitchOps', () => {
  it('removeTop drops the highest interval', () => {
    expect(removeTop(Cmaj7).intervals).toEqual([0, 4, 7]);
  });

  it('removeTop refuses to remove the last remaining interval', () => {
    const single: PitchSet = { rootPC: 0, intervals: [0], name: 'C' };
    expect(removeTop(single)).toEqual(single);
  });

  it('addTop pushes the next canonical interval above the current max', () => {
    // Cmaj7 has max=11; next in pool > 11 is 13.
    expect(addTop(Cmaj7).intervals).toEqual([0, 4, 7, 11, 13]);
  });

  it('addTop then removeTop is identity on this chord', () => {
    const after = removeTop(addTop(Cmaj7));
    expect(after.intervals).toEqual(Cmaj7.intervals);
  });

  it('removeBottom drops the root, producing a rootless voicing', () => {
    expect(removeBottom(Cmaj7).intervals).toEqual([4, 7, 11]);
    expect(removeBottom(Cmaj7).name).toMatch(/no root|\(/);
  });

  it('addBottom re-adds the root after a rootless state', () => {
    const rootless = removeBottom(Cmaj7);
    const restored = addBottom(rootless);
    expect(restored.intervals).toContain(0);
  });

  it('addTop on a chord with 9 adds something above 14', () => {
    // Max is 14; next in pool > 14 is 15.
    expect(addTop(C9).intervals).toEqual([0, 4, 7, 10, 14, 15]);
  });

  it('re-derives chord name after edit', () => {
    expect(removeTop(Cmaj7).name).toBe('Cmaj');
  });
});
