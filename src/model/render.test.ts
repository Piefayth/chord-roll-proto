import { describe, it, expect } from 'vitest';
import { renderObject, renderDocument } from './render';
import type { TimelineObject, DocumentState } from './types';

const obj: TimelineObject = {
  id: 'a',
  pitchSet: { rootPC: 0, intervals: [0, 4, 7], name: 'C' },
  voicing: {
    centerNote: 60,
    bottomPitchClass: 0,
    compactness: 0,
    bassSplit: false,
    bassDistance: 1,
    octaveSpan: 1,
    range: [21, 108],
  },
  generator: {
    pitchPattern: { kind: 'allAtOnce' },
    rhythm: { kind: 'simultaneous' },
  },
  position: 4,
  duration: 2,
};

describe('renderObject', () => {
  it('stamps absolute positions = object.position + event onset', () => {
    const notes = renderObject(obj, 120);
    expect(notes.length).toBe(3);
    expect(notes.every((n) => n.onset === 4)).toBe(true);
    expect(notes.map((n) => n.pitch)).toEqual([60, 64, 67]);
    expect(notes.every((n) => n.objectId === 'a')).toBe(true);
  });

  it('produces stable, unique note ids', () => {
    const notes = renderObject(obj, 120);
    const ids = new Set(notes.map((n) => n.id));
    expect(ids.size).toBe(notes.length);
  });
});

describe('renderDocument', () => {
  it('concatenates notes from each object', () => {
    const doc: DocumentState = {
      tempo: 120,
      objects: [obj, { ...obj, id: 'b', position: 8 }],
    };
    const notes = renderDocument(doc);
    expect(notes.length).toBe(6);
    expect(new Set(notes.map((n) => n.objectId))).toEqual(new Set(['a', 'b']));
  });
});
