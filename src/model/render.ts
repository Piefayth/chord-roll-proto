import type { DocumentState, RenderedNote, TimelineObject } from './types';
import { resolveVoicing } from './voicing';
import { applyGenerator } from './generator';
import { effectivePitchSet } from './pitchOps';

// Pure: TimelineObject -> RenderedNote[]
export function renderObject(obj: TimelineObject, bpm: number): RenderedNote[] {
  const pitches = resolveVoicing(effectivePitchSet(obj), obj.voicing);
  const events = applyGenerator(obj.generator, pitches, obj.duration, bpm);
  return events.map((e, i) => ({
    id: `${obj.id}:${i}`,
    objectId: obj.id,
    onset: obj.position + e.onset,
    duration: e.duration,
    pitch: e.pitch,
    velocity: e.velocity,
  }));
}

export function renderDocument(doc: DocumentState): RenderedNote[] {
  const out: RenderedNote[] = [];
  for (const obj of doc.objects) {
    for (const n of renderObject(obj, doc.tempo)) out.push(n);
  }
  return out;
}
