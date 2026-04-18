import type { PitchSet, Voicing } from './types';

// Resolve a PitchSet + Voicing into an ordered list of concrete MIDI pitches.
export function resolveVoicing(pitchSet: PitchSet, voicing: Voicing): number[] {
  const { rootPC, intervals } = pitchSet;
  const {
    centerNote,
    bottomPitchClass,
    compactness,
    bassSplit,
    bassDistance,
    octaveSpan,
    range,
  } = voicing;

  if (intervals.length === 0) return [];

  // 1. Compute pitch classes from intervals (deduped, preserving order).
  const seen = new Set<number>();
  const pitchClasses: number[] = [];
  for (const iv of intervals) {
    const pc = ((rootPC + iv) % 12 + 12) % 12;
    if (!seen.has(pc)) {
      seen.add(pc);
      pitchClasses.push(pc);
    }
  }

  // 2. Rotate so bottomPitchClass is first; fall back to root if not present.
  let bottomIdx = pitchClasses.indexOf(((bottomPitchClass % 12) + 12) % 12);
  if (bottomIdx < 0) bottomIdx = pitchClasses.indexOf(((rootPC % 12) + 12) % 12);
  if (bottomIdx < 0) bottomIdx = 0;
  const rotated = [...pitchClasses.slice(bottomIdx), ...pitchClasses.slice(0, bottomIdx)];

  // 3. Build the close-voiced cluster. Place the bottom pitch class at the
  //    MIDI value closest to centerNote (ties go to the lower octave).
  const baseOctave = Math.floor(centerNote / 12);
  const candA = baseOctave * 12 + rotated[0];
  const candB = candA >= centerNote ? candA - 12 : candA + 12;
  const bottomMidi =
    Math.abs(candA - centerNote) <= Math.abs(candB - centerNote) ? candA : candB;
  const cluster: number[] = [bottomMidi];
  for (let i = 1; i < rotated.length; i++) {
    const targetPC = rotated[i];
    let next = cluster[cluster.length - 1] + 1;
    while (((next % 12) + 12) % 12 !== targetPC) next++;
    cluster.push(next);
  }

  // 4. Compactness (really "spread"): 0 = close cluster within an octave.
  //    As compactness increases, raise upper voices an octave one by one, from
  //    the top down. With N upper voices, voice i (counted from the top, 1-based)
  //    lifts when compactness > i/(N+1) — so every slider region does something.
  const cmp = Math.max(0, Math.min(1, compactness));
  const upperCount = cluster.length - 1;
  const spread = [...cluster];
  for (let i = 1; i <= upperCount; i++) {
    const threshold = i / (upperCount + 1);
    if (cmp > threshold) {
      spread[spread.length - i] += 12;
    }
  }
  spread.sort((a, b) => a - b);

  // 5. bassSplit: duplicate lowest pitch `bassDistance` octaves below.
  const withBass = [...spread];
  if (bassSplit) {
    const bassPitch = spread[0] - 12 * Math.max(1, Math.floor(bassDistance));
    withBass.unshift(bassPitch);
  }

  // 6. octaveSpan: duplicate the cluster (not the bass) at successive octaves above.
  const span = Math.max(1, Math.floor(octaveSpan));
  const expanded: number[] = [...withBass];
  if (span > 1) {
    for (let s = 1; s < span; s++) {
      for (const p of spread) expanded.push(p + 12 * s);
    }
  }

  // 7. Clamp + dedupe + sort ascending.
  const [lo, hi] = range;
  const clamped = expanded.filter((p) => p >= lo && p <= hi);
  const final = Array.from(new Set(clamped)).sort((a, b) => a - b);
  return final;
}
