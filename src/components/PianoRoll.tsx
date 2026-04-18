import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentState, RenderedNote, TimelineObject } from '../model/types';
import { renderObject } from '../model/render';
import { pcName } from '../model/chords';
import { addBottom, addTop, removeBottom, removeTop } from '../model/pitchOps';

const MIN_PITCH = 36; // C2
const MAX_PITCH = 96; // C7
const PITCH_ROW_PX = 8;
const BEAT_PX = 64;
const REGION_PAD = 4;
const RULER_HEIGHT = 18;
const EDGE_ZONE = 16; // px; thickness of draggable edge overlay
const EDGE_TRIGGER_PX = 18; // px of vertical drag to add/remove a pitch class
const BEAT_QUANTIZE = 0.25; // snap-to-quarter-beat for position/duration
const DRAG_START_THRESHOLD = 4; // px before a tap counts as a drag

interface Props {
  doc: DocumentState;
  selectedId: string | null;
  currentBeat: number; // playhead position in beats; <0 to hide
  totalBeats?: number;
  onSelect?: (id: string | null) => void;
  onCycleSelectAt?: (beat: number, pitch: number) => void;
  onCreate?: (beatPosition: number) => void;
  onUpdate?: (id: string, patch: Partial<TimelineObject>) => void;
  onUpdatePitchSet?: (id: string, direction: 'removeTop' | 'addTop' | 'removeBottom' | 'addBottom') => void;
}

interface ObjectGeometry {
  obj: TimelineObject;
  notes: RenderedNote[];
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragZone = 'body' | 'left' | 'right' | 'top' | 'bottom';
interface ActiveDrag {
  pointerId: number;
  zone: DragZone;
  objId: string;
  startX: number;
  startY: number;
  origPosition: number;
  origDuration: number;
  origCenterNote: number;
  lastStepCount: number; // integer threshold count of dy/EDGE_TRIGGER_PX last emitted for pitch edges
  didMove: boolean;
}

function midiToY(pitch: number): number {
  return (MAX_PITCH - pitch) * PITCH_ROW_PX;
}
function yToPitch(y: number): number {
  return MAX_PITCH - Math.round(y / PITCH_ROW_PX);
}
function beatToX(beat: number): number {
  return beat * BEAT_PX;
}
function xToBeat(x: number): number {
  return x / BEAT_PX;
}
function quantize(beat: number): number {
  return Math.max(0, Math.round(beat / BEAT_QUANTIZE) * BEAT_QUANTIZE);
}

export function PianoRoll({
  doc,
  selectedId,
  currentBeat,
  totalBeats = 16,
  onSelect,
  onCycleSelectAt,
  onCreate,
  onUpdate,
  onUpdatePitchSet,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const [, forceRerender] = useState(0);

  const geometries: ObjectGeometry[] = useMemo(() => {
    return doc.objects.map((obj) => {
      const notes = renderObject(obj, doc.tempo);
      const pitches = notes.map((n) => n.pitch);
      const top = pitches.length ? Math.max(...pitches) : obj.voicing.centerNote;
      const bottom = pitches.length ? Math.min(...pitches) : obj.voicing.centerNote;
      const x = beatToX(obj.position) - REGION_PAD;
      const y = midiToY(top) - REGION_PAD;
      const width = beatToX(obj.duration) + REGION_PAD * 2;
      const height = midiToY(bottom) - midiToY(top) + PITCH_ROW_PX + REGION_PAD * 2;
      return { obj, notes, x, y, width, height };
    });
  }, [doc]);

  const totalWidth = beatToX(totalBeats);
  const pitchRows = MAX_PITCH - MIN_PITCH + 1;
  const totalHeight = RULER_HEIGHT + pitchRows * PITCH_ROW_PX;

  // Classify which zone of an object's bounding box the pointerdown landed in.
  const classifyZone = (geom: ObjectGeometry, localX: number, localY: number): DragZone => {
    const xIn = localX - geom.x;
    const yIn = localY - geom.y;
    const isLeft = xIn < EDGE_ZONE;
    const isRight = xIn > geom.width - EDGE_ZONE;
    const isTop = yIn < EDGE_ZONE;
    const isBottom = yIn > geom.height - EDGE_ZONE;
    // Priority: corners fall back to horizontal (resize wins over pitch).
    if (isLeft) return 'left';
    if (isRight) return 'right';
    if (isTop) return 'top';
    if (isBottom) return 'bottom';
    return 'body';
  };

  // Convert a pointer event to SVG-local coordinates.
  const svgCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    const { x, y } = svgCoords(e.clientX, e.clientY);
    if (y < RULER_HEIGHT) return; // ignore ruler area
    // Figure out which object (if any) the point is inside. Check in reverse
    // render order so topmost wins.
    const hits: ObjectGeometry[] = [];
    for (let i = geometries.length - 1; i >= 0; i--) {
      const g = geometries[i];
      if (x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height) hits.push(g);
    }
    if (hits.length === 0) {
      // Tap on empty roll: track pointer; create on up only if it was a tap (no significant move).
      const startBeat = Math.max(0, xToBeat(x));
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const onMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - startX) > DRAG_START_THRESHOLD || Math.abs(ev.clientY - startY) > DRAG_START_THRESHOLD) {
          moved = true;
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (!moved) {
          onSelect?.(null);
          onCreate?.(quantize(startBeat));
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      return;
    }
    // One or more objects under pointer; use the topmost.
    const target = hits[0];
    // Determine the zone.
    const zone = classifyZone(target, x, y);
    // Start tracking a drag.
    const drag: ActiveDrag = {
      pointerId: e.pointerId,
      zone,
      objId: target.obj.id,
      startX: e.clientX,
      startY: e.clientY,
      origPosition: target.obj.position,
      origDuration: target.obj.duration,
      origCenterNote: target.obj.voicing.centerNote,
      lastStepCount: 0,
      didMove: false,
    };
    dragRef.current = drag;
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    e.preventDefault();
  };

  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.didMove && Math.hypot(dx, dy) > DRAG_START_THRESHOLD) drag.didMove = true;
    // Convert pixel deltas to world units. A mobile svg may be scaled by CSS
    // layout, but for a direct SVG with fixed viewBox, 1 client px ≈ 1 svg px
    // at default zoom. Good enough for the prototype.
    const beatDelta = dx / BEAT_PX;
    const pitchDelta = -dy / PITCH_ROW_PX;
    const obj = doc.objects.find((o) => o.id === drag.objId);
    if (!obj) return;

    switch (drag.zone) {
      case 'body': {
        const nextPos = quantize(drag.origPosition + beatDelta);
        const nextCenter = Math.max(MIN_PITCH, Math.min(MAX_PITCH, Math.round(drag.origCenterNote + pitchDelta)));
        if (nextPos !== obj.position || nextCenter !== obj.voicing.centerNote) {
          onUpdate?.(drag.objId, {
            position: nextPos,
            voicing: { ...obj.voicing, centerNote: nextCenter },
          });
        }
        break;
      }
      case 'right': {
        const nextDur = Math.max(BEAT_QUANTIZE, quantize(drag.origDuration + beatDelta));
        if (nextDur !== obj.duration) onUpdate?.(drag.objId, { duration: nextDur });
        break;
      }
      case 'left': {
        // Move position right = shrink; move position left = grow. Anchor right edge.
        const rawPos = quantize(drag.origPosition + beatDelta);
        const anchorRight = drag.origPosition + drag.origDuration;
        const nextPos = Math.max(0, Math.min(rawPos, anchorRight - BEAT_QUANTIZE));
        const nextDur = Math.max(BEAT_QUANTIZE, anchorRight - nextPos);
        if (nextPos !== obj.position || nextDur !== obj.duration) {
          onUpdate?.(drag.objId, { position: nextPos, duration: nextDur });
        }
        break;
      }
      case 'top': {
        // Top edge: drag down (dy+) removes from top; drag up (dy-) adds on top.
        const steps = Math.trunc(dy / EDGE_TRIGGER_PX);
        const delta = steps - drag.lastStepCount;
        if (delta !== 0) {
          const dir = delta > 0 ? 'removeTop' : 'addTop';
          for (let i = 0; i < Math.abs(delta); i++) onUpdatePitchSet?.(drag.objId, dir);
          drag.lastStepCount = steps;
        }
        break;
      }
      case 'bottom': {
        // Bottom edge: drag down (dy+) re-adds root; drag up (dy-) removes bottom.
        const steps = Math.trunc(dy / EDGE_TRIGGER_PX);
        const delta = steps - drag.lastStepCount;
        if (delta !== 0) {
          const dir = delta > 0 ? 'addBottom' : 'removeBottom';
          for (let i = 0; i < Math.abs(delta); i++) onUpdatePitchSet?.(drag.objId, dir);
          drag.lastStepCount = steps;
        }
        break;
      }
    }
    forceRerender((n) => n + 1);
  };

  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    // If the gesture was a tap (no drag), select or cycle-select the object.
    if (!drag.didMove) {
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const beat = xToBeat(x);
      const pitch = yToPitch(y - RULER_HEIGHT);
      if (onCycleSelectAt) onCycleSelectAt(beat, pitch);
      else onSelect?.(drag.objId);
    }
    dragRef.current = null;
  };

  // Prevent default touch behavior (pull-to-refresh, scroll) so vertical body
  // drags on regions actually move the region rather than scrolling the page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    svg.addEventListener('touchmove', prevent, { passive: false });
    return () => svg.removeEventListener('touchmove', prevent);
  }, []);

  return (
    <div className="piano-roll-wrap" data-testid="piano-roll">
      <svg
        ref={svgRef}
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        role="img"
        aria-label="piano roll"
        style={{ touchAction: 'none', display: 'block' }}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
      >
        {/* Ruler */}
        <g>
          <rect x={0} y={0} width={totalWidth} height={RULER_HEIGHT} fill="#111722" />
          {Array.from({ length: totalBeats + 1 }).map((_, i) => (
            <g key={i}>
              <line
                x1={i * BEAT_PX}
                x2={i * BEAT_PX}
                y1={0}
                y2={RULER_HEIGHT}
                stroke={i % 4 === 0 ? '#3a4a5e' : '#243042'}
                strokeWidth={i % 4 === 0 ? 1.5 : 1}
              />
              {i % 4 === 0 && (
                <text
                  x={i * BEAT_PX + 4}
                  y={RULER_HEIGHT - 5}
                  fontSize={10}
                  fill="#94a3b8"
                  fontFamily="system-ui, sans-serif"
                >
                  {i / 4 + 1}
                </text>
              )}
            </g>
          ))}
        </g>
        <g transform={`translate(0, ${RULER_HEIGHT})`}>
          {/* horizontal pitch rows */}
          {Array.from({ length: pitchRows }).map((_, i) => {
            const pitch = MAX_PITCH - i;
            const pc = ((pitch % 12) + 12) % 12;
            const isC = pc === 0;
            const isBlack = [1, 3, 6, 8, 10].includes(pc);
            return (
              <rect
                key={pitch}
                x={0}
                y={i * PITCH_ROW_PX}
                width={totalWidth}
                height={PITCH_ROW_PX}
                fill={isC ? '#1d2530' : isBlack ? '#161a21' : '#1a1f27'}
              />
            );
          })}
          {/* vertical beat lines */}
          {Array.from({ length: totalBeats + 1 }).map((_, i) => (
            <line
              key={i}
              x1={i * BEAT_PX}
              x2={i * BEAT_PX}
              y1={0}
              y2={pitchRows * PITCH_ROW_PX}
              stroke={i % 4 === 0 ? '#3a4a5e' : '#243042'}
              strokeWidth={i % 4 === 0 ? 1.5 : 1}
            />
          ))}

          {/* objects */}
          {geometries.map(({ obj, notes, x, y, width, height }) => {
            const selected = obj.id === selectedId;
            return (
              <g key={obj.id} data-testid={`object-${obj.id}`}>
                <rect
                  x={x}
                  y={y - RULER_HEIGHT} /* visually shift back up */
                  width={width}
                  height={height}
                  fill={selected ? 'rgba(96, 165, 250, 0.22)' : 'rgba(96, 165, 250, 0.10)'}
                  stroke={selected ? '#60a5fa' : '#3a5a8a'}
                  strokeWidth={selected ? 2 : 1}
                  rx={4}
                  transform={`translate(0, ${RULER_HEIGHT})`}
                />
                {notes.map((n) => (
                  <rect
                    key={n.id}
                    data-testid={`note-${n.id}`}
                    x={beatToX(n.onset)}
                    y={midiToY(n.pitch) - RULER_HEIGHT}
                    width={Math.max(2, beatToX(n.duration) - 2)}
                    height={PITCH_ROW_PX - 1}
                    fill={selected ? '#60a5fa' : '#7aa6d8'}
                    rx={1.5}
                    transform={`translate(0, ${RULER_HEIGHT})`}
                  />
                ))}
                {/* edge handles visualized only when selected */}
                {selected && (
                  <g transform={`translate(0, ${RULER_HEIGHT})`} pointerEvents="none">
                    {/* top */}
                    <rect
                      x={x + EDGE_ZONE}
                      y={y - RULER_HEIGHT + 2}
                      width={width - EDGE_ZONE * 2}
                      height={2}
                      fill="#60a5fa"
                      opacity={0.6}
                    />
                    {/* bottom */}
                    <rect
                      x={x + EDGE_ZONE}
                      y={y - RULER_HEIGHT + height - 4}
                      width={width - EDGE_ZONE * 2}
                      height={2}
                      fill="#60a5fa"
                      opacity={0.6}
                    />
                    {/* left */}
                    <rect
                      x={x + 2}
                      y={y - RULER_HEIGHT + EDGE_ZONE}
                      width={2}
                      height={height - EDGE_ZONE * 2}
                      fill="#60a5fa"
                      opacity={0.6}
                    />
                    {/* right */}
                    <rect
                      x={x + width - 4}
                      y={y - RULER_HEIGHT + EDGE_ZONE}
                      width={2}
                      height={height - EDGE_ZONE * 2}
                      fill="#60a5fa"
                      opacity={0.6}
                    />
                  </g>
                )}
                <text
                  x={x + 6}
                  y={y - RULER_HEIGHT + 12}
                  fill={selected ? '#dbeafe' : '#94b8e0'}
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                  transform={`translate(0, ${RULER_HEIGHT})`}
                >
                  {obj.pitchSet.name} · {pcName(obj.voicing.bottomPitchClass)} bass
                </text>
              </g>
            );
          })}

          {/* playhead */}
          {currentBeat >= 0 && (
            <line
              data-testid="playhead"
              x1={beatToX(currentBeat)}
              x2={beatToX(currentBeat)}
              y1={0}
              y2={pitchRows * PITCH_ROW_PX}
              stroke="#fbbf24"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

// Dispatch helper used when the PianoRoll emits an abstract 'pitchSet' edit.
export function applyPitchSetEdit(
  obj: TimelineObject,
  direction: 'removeTop' | 'addTop' | 'removeBottom' | 'addBottom'
): TimelineObject {
  switch (direction) {
    case 'removeTop':
      return { ...obj, pitchSet: removeTop(obj.pitchSet) };
    case 'addTop':
      return { ...obj, pitchSet: addTop(obj.pitchSet) };
    case 'removeBottom':
      return { ...obj, pitchSet: removeBottom(obj.pitchSet) };
    case 'addBottom':
      return { ...obj, pitchSet: addBottom(obj.pitchSet) };
  }
}
