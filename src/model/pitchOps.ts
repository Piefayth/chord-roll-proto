import type { PitchSet, TimelineObject } from './types';
import { inferChordLabel } from './chords';

// Compute the effective pitch set for voicing: applies the object's top/bottom
// trim counts. Trim never adds notes — it only slices off the top or bottom
// of the user-chosen interval list.
export function effectivePitchSet(obj: TimelineObject): PitchSet {
  const sorted = [...new Set(obj.pitchSet.intervals)].sort((a, b) => a - b);
  const top = Math.max(0, Math.floor(obj.topTrim ?? 0));
  const bot = Math.max(0, Math.floor(obj.bottomTrim ?? 0));
  // Always keep at least one note.
  const maxTrim = Math.max(0, sorted.length - 1);
  const totalTrim = Math.min(top + bot, maxTrim);
  // Distribute the clamp: prefer keeping bottom if both request a lot.
  let clampedBot = Math.min(bot, maxTrim);
  let clampedTop = Math.min(top, maxTrim - clampedBot);
  if (clampedTop + clampedBot > maxTrim) {
    clampedBot = Math.max(0, maxTrim - clampedTop);
  }
  if (clampedTop + clampedBot > totalTrim) {
    // impossible path, but keep types happy
    clampedTop = Math.max(0, totalTrim - clampedBot);
  }
  const sliced = sorted.slice(clampedBot, sorted.length - clampedTop);
  return {
    ...obj.pitchSet,
    intervals: sliced,
    name: inferChordLabel(obj.pitchSet.rootPC, sliced),
  };
}

// Trim operations: they only adjust the counts. Voicing reads the effective
// intervals at render time.
export function incTopTrim(obj: TimelineObject): TimelineObject {
  const sorted = [...new Set(obj.pitchSet.intervals)];
  const top = Math.max(0, obj.topTrim ?? 0);
  const bot = Math.max(0, obj.bottomTrim ?? 0);
  const remaining = sorted.length - top - bot;
  if (remaining <= 1) return obj;
  return { ...obj, topTrim: top + 1 };
}
export function decTopTrim(obj: TimelineObject): TimelineObject {
  const top = Math.max(0, obj.topTrim ?? 0);
  if (top <= 0) return obj;
  return { ...obj, topTrim: top - 1 };
}
export function incBottomTrim(obj: TimelineObject): TimelineObject {
  const sorted = [...new Set(obj.pitchSet.intervals)];
  const top = Math.max(0, obj.topTrim ?? 0);
  const bot = Math.max(0, obj.bottomTrim ?? 0);
  const remaining = sorted.length - top - bot;
  if (remaining <= 1) return obj;
  return { ...obj, bottomTrim: bot + 1 };
}
export function decBottomTrim(obj: TimelineObject): TimelineObject {
  const bot = Math.max(0, obj.bottomTrim ?? 0);
  if (bot <= 0) return obj;
  return { ...obj, bottomTrim: bot - 1 };
}
