import { useCallback, useMemo, useRef, useState } from 'react';
import type { DocumentState, RenderedNote, TimelineObject } from '../model/types';
import { renderObject } from '../model/render';
import { pcName } from '../model/chords';
import { addBottom, addTop, removeBottom, removeTop } from '../model/pitchOps';
import { classifyZoneExtended } from '../model/gestureOps';

const MIN_PITCH = 36; // C2
const MAX_PITCH = 96; // C7
const PITCH_ROW_PX = 8;
const BEAT_PX = 64;
const REGION_PAD = 4;
const RULER_HEIGHT = 18;
const OUTER_HANDLE = 14; // px of hit area extending outside the region
const EDGE_TRIGGER_PX = 18; // px of vertical drag per pitch add/remove step
const BEAT_QUANTIZE = 0.25;
const DRAG_START_THRESHOLD = 4;

interface Props {
  doc: DocumentState;
  selectedId: string | null;
  currentBeat: number; // <0 to hide
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
  lastStepCount: number;
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

// Classification is delegated to the pure helper in gestureOps.

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

  // Pointer handlers are attached to individual region <g>s. Each <g> sets
  // touch-action: none so iOS won't try to scroll while you drag it. The
  // outer scroll container keeps its default touch-action so empty space
  // allows two-direction panning.
  const beginRegionDrag = (obj: TimelineObject, geom: ObjectGeometry, e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    const { x, y } = svgCoords(e.clientX, e.clientY);
    const selected = obj.id === selectedId;
    const zone = classifyZoneExtended(geom, x, y, OUTER_HANDLE, selected) ?? 'body';
    const drag: ActiveDrag = {
      pointerId: e.pointerId,
      zone,
      objId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      origPosition: obj.position,
      origDuration: obj.duration,
      origCenterNote: obj.voicing.centerNote,
      lastStepCount: 0,
      didMove: false,
    };
    dragRef.current = drag;
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    e.stopPropagation();
  };

  const onRegionPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.didMove && Math.hypot(dx, dy) > DRAG_START_THRESHOLD) drag.didMove = true;
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

  const onRegionPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!drag.didMove) {
      // Tap without a drag → select / cycle on stacked.
      const { x, y } = svgCoords(e.clientX, e.clientY);
      const beat = xToBeat(x);
      const pitch = yToPitch(y - RULER_HEIGHT);
      if (onCycleSelectAt) onCycleSelectAt(beat, pitch);
      else onSelect?.(drag.objId);
    }
    dragRef.current = null;
  };

  // Background pointer: empty-space tap creates an object (when no movement
  // occurred). If the user scrolls with this same gesture, the browser fires
  // pointercancel (or pointermove with significant delta) and we suppress.
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    // Skip if the target element is a region handle (React handles that separately).
    const { x, y } = svgCoords(e.clientX, e.clientY);
    if (y < RULER_HEIGHT) return;
    const startBeat = Math.max(0, xToBeat(x));
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (
        Math.abs(ev.clientX - startX) > DRAG_START_THRESHOLD ||
        Math.abs(ev.clientY - startY) > DRAG_START_THRESHOLD
      ) {
        moved = true;
      }
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    const onUp = () => {
      cleanup();
      if (!moved) {
        onSelect?.(null);
        onCreate?.(quantize(startBeat));
      }
    };
    const onCancel = () => {
      cleanup();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  return (
    <div className="piano-roll-wrap" data-testid="piano-roll">
      <svg
        ref={svgRef}
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        role="img"
        aria-label="piano roll"
        style={{ display: 'block', touchAction: 'auto' }}
        onPointerDown={onBackgroundPointerDown}
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
          {/* pitch rows */}
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
          {/* beat lines */}
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

          {/* objects. note the transform is on the outer group; per-region <g>
              is in the translated space, so its x/y are local. */}
          {geometries.map((geom) => {
            const { obj, notes, x, y, width, height } = geom;
            const selected = obj.id === selectedId;
            return (
              <g
                key={obj.id}
                data-testid={`object-${obj.id}`}
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => beginRegionDrag(obj, geom, e)}
                onPointerMove={onRegionPointerMove}
                onPointerUp={onRegionPointerUp}
                onPointerCancel={onRegionPointerUp}
              >
                {/* Hit-area halo: includes outer handle margin. Transparent
                    fill so users can grab edges even on very thin regions. */}
                <rect
                  x={x - OUTER_HANDLE}
                  y={y - RULER_HEIGHT - OUTER_HANDLE}
                  width={width + OUTER_HANDLE * 2}
                  height={height + OUTER_HANDLE * 2}
                  fill="transparent"
                  transform={`translate(0, ${RULER_HEIGHT})`}
                />
                <rect
                  x={x}
                  y={y - RULER_HEIGHT}
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
                {selected && (
                  <g transform={`translate(0, ${RULER_HEIGHT})`} pointerEvents="none">
                    {/* top handle */}
                    <rect
                      x={x + 6}
                      y={y - RULER_HEIGHT - 3}
                      width={Math.max(12, width - 12)}
                      height={3}
                      fill="#60a5fa"
                    />
                    {/* bottom handle */}
                    <rect
                      x={x + 6}
                      y={y - RULER_HEIGHT + height}
                      width={Math.max(12, width - 12)}
                      height={3}
                      fill="#60a5fa"
                    />
                    {/* left handle */}
                    <rect
                      x={x - 3}
                      y={y - RULER_HEIGHT + 6}
                      width={3}
                      height={Math.max(12, height - 12)}
                      fill="#60a5fa"
                    />
                    {/* right handle */}
                    <rect
                      x={x + width}
                      y={y - RULER_HEIGHT + 6}
                      width={3}
                      height={Math.max(12, height - 12)}
                      fill="#60a5fa"
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
