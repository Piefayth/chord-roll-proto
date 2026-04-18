import { useCallback, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { DocumentState, RenderedNote, TimelineObject } from '../model/types';
import { renderObject } from '../model/render';
import { pcName } from '../model/chords';
import { addBottom, addTop, removeBottom, removeTop } from '../model/pitchOps';
import { classifyZoneExtended, hitTest } from '../model/gestureOps';

const MIN_PITCH = 36; // C2
const MAX_PITCH = 96; // C7
const PITCH_ROW_PX = 8;
const BEAT_PX = 64;
const REGION_PAD = 4;
const RULER_HEIGHT = 18;
const OUTER_HANDLE = 14;
const EDGE_TRIGGER_PX = 18;
const BEAT_QUANTIZE = 0.25;
const DRAG_START_THRESHOLD = 4;

interface Props {
  doc: DocumentState;
  selectedId: string | null;
  currentBeat: number;
  totalBeats?: number;
  scrollRef?: RefObject<HTMLElement | null>;
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

interface EmptyTap {
  pointerId: number;
  startX: number;
  startY: number;
  beat: number;
  moved: boolean;
}

interface PanState {
  scrollLeft: number;
  scrollTop: number;
  avgClientX: number;
  avgClientY: number;
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

function averagePointer(pointers: Map<number, { clientX: number; clientY: number }>) {
  let sx = 0;
  let sy = 0;
  for (const p of pointers.values()) {
    sx += p.clientX;
    sy += p.clientY;
  }
  const n = Math.max(1, pointers.size);
  return { x: sx / n, y: sy / n };
}

export function PianoRoll({
  doc,
  selectedId,
  currentBeat,
  totalBeats = 16,
  scrollRef,
  onSelect,
  onCycleSelectAt,
  onCreate,
  onUpdate,
  onUpdatePitchSet,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const emptyTapRef = useRef<EmptyTap | null>(null);
  const pointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const panRef = useRef<PanState | null>(null);
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

  // Given an SVG local point, find the topmost region whose inflated hit box
  // contains it, along with the classified zone. Returns null on miss.
  const hitRegion = (svgX: number, svgY: number): { geom: ObjectGeometry; zone: DragZone } | null => {
    const inflated = geometries.map((g) => ({
      id: g.obj.id,
      box: { x: g.x - OUTER_HANDLE, y: g.y - OUTER_HANDLE, width: g.width + 2 * OUTER_HANDLE, height: g.height + 2 * OUTER_HANDLE },
    }));
    const hits = hitTest(inflated, svgX, svgY);
    if (hits.length === 0) return null;
    const topId = hits[0];
    const geom = geometries.find((g) => g.obj.id === topId)!;
    const selected = topId === selectedId;
    const zone = classifyZoneExtended(geom, svgX, svgY, OUTER_HANDLE, selected) ?? 'body';
    return { geom, zone };
  };

  const enterPanMode = () => {
    // Abort any in-flight single-finger interaction; stop sending updates but
    // leave the object at whatever state it's already in (don't revert).
    dragRef.current = null;
    emptyTapRef.current = null;
    const scroller = scrollRef?.current;
    if (!scroller) return;
    const avg = averagePointer(pointersRef.current);
    panRef.current = {
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
      avgClientX: avg.x,
      avgClientY: avg.y,
    };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }

    if (pointersRef.current.size >= 2) {
      enterPanMode();
      return;
    }

    // Single finger down.
    const { x: svgX, y: svgY } = svgCoords(e.clientX, e.clientY);
    if (svgY < RULER_HEIGHT) return; // ignore ruler area
    const hit = hitRegion(svgX, svgY);
    if (hit) {
      dragRef.current = {
        pointerId: e.pointerId,
        zone: hit.zone,
        objId: hit.geom.obj.id,
        startX: e.clientX,
        startY: e.clientY,
        origPosition: hit.geom.obj.position,
        origDuration: hit.geom.obj.duration,
        origCenterNote: hit.geom.obj.voicing.centerNote,
        lastStepCount: 0,
        didMove: false,
      };
      return;
    }
    emptyTapRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      beat: Math.max(0, xToBeat(svgX)),
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Pan mode: translate average movement into scrollLeft/scrollTop.
    if (panRef.current && pointersRef.current.size >= 2) {
      const scroller = scrollRef?.current;
      if (!scroller) return;
      const avg = averagePointer(pointersRef.current);
      scroller.scrollLeft = panRef.current.scrollLeft - (avg.x - panRef.current.avgClientX);
      scroller.scrollTop = panRef.current.scrollTop - (avg.y - panRef.current.avgClientY);
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
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
      return;
    }

    const tap = emptyTapRef.current;
    if (tap && tap.pointerId === e.pointerId) {
      if (
        Math.abs(e.clientX - tap.startX) > DRAG_START_THRESHOLD ||
        Math.abs(e.clientY - tap.startY) > DRAG_START_THRESHOLD
      ) {
        tap.moved = true;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const hadPointer = pointersRef.current.delete(e.pointerId);
    if (!hadPointer) return;

    // Exit pan mode when fewer than 2 pointers remain.
    if (pointersRef.current.size < 2) {
      panRef.current = null;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      if (!drag.didMove) {
        const { x, y } = svgCoords(e.clientX, e.clientY);
        const beat = xToBeat(x);
        const pitch = yToPitch(y - RULER_HEIGHT);
        if (onCycleSelectAt) onCycleSelectAt(beat, pitch);
        else onSelect?.(drag.objId);
      }
      dragRef.current = null;
      return;
    }
    const tap = emptyTapRef.current;
    if (tap && tap.pointerId === e.pointerId) {
      if (!tap.moved) {
        onSelect?.(null);
        onCreate?.(quantize(tap.beat));
      }
      emptyTapRef.current = null;
    }
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
        style={{ display: 'block', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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

          {geometries.map((geom) => {
            const { obj, notes, x, y, width, height } = geom;
            const selected = obj.id === selectedId;
            return (
              <g key={obj.id} data-testid={`object-${obj.id}`}>
                <rect
                  x={x}
                  y={y - RULER_HEIGHT}
                  width={width}
                  height={height}
                  fill={selected ? 'rgba(96, 165, 250, 0.22)' : 'rgba(96, 165, 250, 0.10)'}
                  stroke={selected ? '#60a5fa' : '#3a5a8a'}
                  strokeWidth={selected ? 2 : 1}
                  rx={4}
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
                  />
                ))}
                {selected && (
                  <g pointerEvents="none">
                    <rect
                      x={x + 6}
                      y={y - RULER_HEIGHT - 3}
                      width={Math.max(12, width - 12)}
                      height={3}
                      fill="#60a5fa"
                    />
                    <rect
                      x={x + 6}
                      y={y - RULER_HEIGHT + height}
                      width={Math.max(12, width - 12)}
                      height={3}
                      fill="#60a5fa"
                    />
                    <rect
                      x={x - 3}
                      y={y - RULER_HEIGHT + 6}
                      width={3}
                      height={Math.max(12, height - 12)}
                      fill="#60a5fa"
                    />
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
