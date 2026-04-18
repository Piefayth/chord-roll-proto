// Pure helpers for piano-roll gesture classification and math.
// Kept framework-free so they can be unit-tested without a DOM.

export type DragZone = 'body' | 'left' | 'right' | 'top' | 'bottom';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Classify which zone of a region box the pointer landed in.
// Corners resolve to horizontal edges (resize takes priority over pitch edit).
export function classifyZone(box: Box, px: number, py: number, edgeZone: number): DragZone {
  const xIn = px - box.x;
  const yIn = py - box.y;
  const isLeft = xIn < edgeZone;
  const isRight = xIn > box.width - edgeZone;
  const isTop = yIn < edgeZone;
  const isBottom = yIn > box.height - edgeZone;
  if (isLeft) return 'left';
  if (isRight) return 'right';
  if (isTop) return 'top';
  if (isBottom) return 'bottom';
  return 'body';
}

// Returns region boxes that contain the point, ordered topmost-first.
// `ids` is aligned with `boxes`; results preserve that ordering reversed.
export function hitTest<T>(boxes: { box: Box; id: T }[], px: number, py: number): T[] {
  const hits: T[] = [];
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (px >= b.box.x && px <= b.box.x + b.box.width && py >= b.box.y && py <= b.box.y + b.box.height) {
      hits.push(b.id);
    }
  }
  return hits;
}

// Quantize a beat value to a given grid (e.g. 0.25). Non-negative.
export function quantizeBeat(beat: number, grid: number): number {
  return Math.max(0, Math.round(beat / grid) * grid);
}

// Compute the next pitch-edit step from a vertical drag. Returns 0 for no-op,
// 1 for "one downward step" (drag down), -1 for "one upward step" (drag up).
// `lastSign` is the direction of the previous emit so we only fire on sign
// transitions, preventing rapid retriggering mid-drag.
export function pitchStepFromDrag(
  dy: number,
  triggerPx: number,
  lastSign: -1 | 0 | 1
): { sign: -1 | 0 | 1; emit: boolean } {
  const raw = Math.trunc(dy / triggerPx);
  const sign = Math.sign(raw) as -1 | 0 | 1;
  return { sign, emit: sign !== 0 && sign !== lastSign };
}

// Cycle-select: given the currently selected id and the hit list at a new tap
// point, pick the next selected id. If the same tap point is hit again and the
// current selection is in the hit list, advance; otherwise pick the first.
export function nextCycleSelection<T>(
  prev: T | null,
  hits: T[],
  sameSpotAsLastTap: boolean
): T | null {
  if (hits.length === 0) return null;
  if (sameSpotAsLastTap && prev !== null) {
    const idx = hits.indexOf(prev);
    if (idx >= 0) return hits[(idx + 1) % hits.length];
  }
  return hits[0];
}

// Resize from the left edge: drag to new raw position, clamp to [0, rightAnchor - minDur].
export function resizeLeft(
  origPos: number,
  origDur: number,
  beatDelta: number,
  quant: number,
  minDur: number
): { position: number; duration: number } {
  const rawPos = quantizeBeat(origPos + beatDelta, quant);
  const rightAnchor = origPos + origDur;
  const nextPos = Math.max(0, Math.min(rawPos, rightAnchor - minDur));
  const nextDur = Math.max(minDur, rightAnchor - nextPos);
  return { position: nextPos, duration: nextDur };
}
