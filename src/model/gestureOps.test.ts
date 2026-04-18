import { describe, it, expect } from 'vitest';
import {
  classifyZone,
  hitTest,
  nextCycleSelection,
  pitchStepFromDrag,
  quantizeBeat,
  resizeLeft,
} from './gestureOps';

const box = { x: 100, y: 50, width: 200, height: 60 };

describe('classifyZone', () => {
  it('returns body for interior points', () => {
    expect(classifyZone(box, 200, 80, 16)).toBe('body');
  });
  it('returns left for near-left points', () => {
    expect(classifyZone(box, 104, 80, 16)).toBe('left');
  });
  it('returns right for near-right points', () => {
    expect(classifyZone(box, 296, 80, 16)).toBe('right');
  });
  it('returns top for near-top points inside', () => {
    expect(classifyZone(box, 200, 52, 16)).toBe('top');
  });
  it('returns bottom for near-bottom points inside', () => {
    expect(classifyZone(box, 200, 108, 16)).toBe('bottom');
  });
  it('prefers horizontal edges when corners qualify for both', () => {
    // top-left corner -> left wins
    expect(classifyZone(box, 102, 52, 16)).toBe('left');
  });
});

describe('hitTest', () => {
  it('returns topmost first when regions overlap', () => {
    const boxes = [
      { id: 'a', box: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'b', box: { x: 20, y: 20, width: 100, height: 100 } }, // rendered on top
    ];
    const hits = hitTest(boxes, 50, 50);
    expect(hits).toEqual(['b', 'a']);
  });
  it('returns empty when no region contains the point', () => {
    expect(hitTest([{ id: 'a', box: { x: 0, y: 0, width: 10, height: 10 } }], 50, 50)).toEqual([]);
  });
});

describe('quantizeBeat', () => {
  it('snaps to the nearest grid cell', () => {
    expect(quantizeBeat(0.6, 0.25)).toBe(0.5);
    expect(quantizeBeat(0.9, 0.25)).toBe(1);
    expect(quantizeBeat(-1, 0.25)).toBe(0);
  });
});

describe('pitchStepFromDrag', () => {
  it('fires once when entering a new sign threshold', () => {
    expect(pitchStepFromDrag(20, 18, 0)).toEqual({ sign: 1, emit: true });
  });
  it('does not refire the same sign', () => {
    expect(pitchStepFromDrag(40, 18, 1)).toEqual({ sign: 1, emit: false });
  });
  it('fires when direction reverses', () => {
    expect(pitchStepFromDrag(-20, 18, 1)).toEqual({ sign: -1, emit: true });
  });
  it('returns sign 0 for small drags', () => {
    expect(pitchStepFromDrag(5, 18, 0)).toEqual({ sign: 0, emit: false });
  });
});

describe('nextCycleSelection', () => {
  it('advances through the stack at the same spot', () => {
    expect(nextCycleSelection('a', ['a', 'b', 'c'], true)).toBe('b');
    expect(nextCycleSelection('c', ['a', 'b', 'c'], true)).toBe('a');
  });
  it('picks first when point differs', () => {
    expect(nextCycleSelection('b', ['x', 'y'], false)).toBe('x');
  });
  it('returns null when no hits', () => {
    expect(nextCycleSelection('a', [], true)).toBe(null);
  });
});

describe('resizeLeft', () => {
  it('shrinks from the left when dragged right', () => {
    const r = resizeLeft(2, 4, 1, 0.25, 0.25);
    expect(r).toEqual({ position: 3, duration: 3 });
  });
  it('grows from the left when dragged left', () => {
    const r = resizeLeft(2, 4, -1, 0.25, 0.25);
    expect(r).toEqual({ position: 1, duration: 5 });
  });
  it('clamps position to 0', () => {
    const r = resizeLeft(2, 4, -5, 0.25, 0.25);
    expect(r.position).toBe(0);
    expect(r.duration).toBe(6);
  });
  it('respects minimum duration', () => {
    const r = resizeLeft(2, 4, 10, 0.25, 0.25);
    expect(r.duration).toBe(0.25);
    expect(r.position).toBe(5.75);
  });
});
