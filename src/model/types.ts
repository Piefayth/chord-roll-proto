// Core data model for Chord Roll. PitchSet = what, Voicing = where, Generator = when.

export interface PitchSet {
  rootPC: number; // 0-11
  intervals: number[]; // semitone offsets from rootPC
  name: string;
}

export interface Voicing {
  centerNote: number; // MIDI register anchor
  bottomPitchClass: number; // 0-11
  compactness: number; // 0-1
  bassSplit: boolean;
  bassDistance: number; // octaves below cluster
  octaveSpan: number; // 1+
  range: [number, number]; // MIDI clamp
}

export type PitchPattern =
  | { kind: 'allAtOnce' }
  | { kind: 'cascadeInOrder' }
  | { kind: 'cycle' }
  | { kind: 'degreeSequence'; degrees: number[] };

export type RhythmSpec =
  | { kind: 'simultaneous' }
  | { kind: 'cascade'; offsetMs: number }
  | { kind: 'periodic'; rateBeats: number }
  | { kind: 'stepGrid'; resolutionBeats: number; cells: boolean[] };

export interface Generator {
  pitchPattern: PitchPattern;
  rhythm: RhythmSpec;
}

export interface TimelineObject {
  id: string;
  pitchSet: PitchSet;
  voicing: Voicing;
  generator: Generator;
  position: number; // beats
  duration: number; // beats
}

export interface RenderedNote {
  id: string;
  objectId: string;
  onset: number; // absolute beats
  duration: number;
  pitch: number; // MIDI note number
  velocity: number; // 0-1
}

export interface DocumentState {
  objects: TimelineObject[];
  tempo: number; // BPM
}
