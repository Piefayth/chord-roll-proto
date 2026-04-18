import { useMemo } from 'react';
import type { DocumentState, RenderedNote, TimelineObject } from '../model/types';
import { renderObject } from '../model/render';
import { pcName } from '../model/chords';

const MIN_PITCH = 36; // C2
const MAX_PITCH = 84; // C6
const PITCH_ROW_PX = 8;
const BEAT_PX = 60;
const REGION_PADDING_PX = 4;

interface Props {
  doc: DocumentState;
  selectedId: string | null;
  onSelect?: (id: string | null) => void;
  totalBeats?: number;
}

interface ObjectGeometry {
  obj: TimelineObject;
  notes: RenderedNote[];
  // bounding box in svg coords
  x: number;
  y: number;
  width: number;
  height: number;
  topPitch: number;
  bottomPitch: number;
}

function midiToY(pitch: number): number {
  // Higher pitch = smaller y. Shift so MAX_PITCH is row 0.
  return (MAX_PITCH - pitch) * PITCH_ROW_PX;
}

function beatToX(beat: number): number {
  return beat * BEAT_PX;
}

export function PianoRoll({ doc, selectedId, onSelect, totalBeats = 8 }: Props) {
  const geometries: ObjectGeometry[] = useMemo(() => {
    return doc.objects.map((obj) => {
      const notes = renderObject(obj, doc.tempo);
      const pitches = notes.map((n) => n.pitch);
      const top = pitches.length ? Math.max(...pitches) : obj.voicing.centerNote;
      const bottom = pitches.length ? Math.min(...pitches) : obj.voicing.centerNote;
      const x = beatToX(obj.position) - REGION_PADDING_PX;
      const y = midiToY(top) - REGION_PADDING_PX;
      const width = beatToX(obj.duration) + REGION_PADDING_PX * 2;
      const height = midiToY(bottom) - midiToY(top) + PITCH_ROW_PX + REGION_PADDING_PX * 2;
      return { obj, notes, x, y, width, height, topPitch: top, bottomPitch: bottom };
    });
  }, [doc]);

  const totalWidth = beatToX(totalBeats);
  const totalHeight = (MAX_PITCH - MIN_PITCH + 1) * PITCH_ROW_PX;

  return (
    <div className="piano-roll-wrap" data-testid="piano-roll">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        role="img"
        aria-label="piano roll"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelect?.(null);
        }}
      >
        {/* horizontal pitch rows: highlight C and white-key rows lightly */}
        {Array.from({ length: MAX_PITCH - MIN_PITCH + 1 }).map((_, i) => {
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
            y2={totalHeight}
            stroke={i % 4 === 0 ? '#3a4a5e' : '#243042'}
            strokeWidth={i % 4 === 0 ? 1.5 : 1}
          />
        ))}
        {/* objects */}
        {geometries.map(({ obj, notes, x, y, width, height }) => {
          const selected = obj.id === selectedId;
          return (
            <g
              key={obj.id}
              data-testid={`object-${obj.id}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect?.(obj.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={selected ? 'rgba(96, 165, 250, 0.18)' : 'rgba(96, 165, 250, 0.10)'}
                stroke={selected ? '#60a5fa' : '#3a5a8a'}
                strokeWidth={selected ? 2 : 1}
                rx={4}
              />
              {notes.map((n) => (
                <rect
                  key={n.id}
                  data-testid={`note-${n.id}`}
                  x={beatToX(n.onset)}
                  y={midiToY(n.pitch)}
                  width={Math.max(2, beatToX(n.duration) - 2)}
                  height={PITCH_ROW_PX - 1}
                  fill={selected ? '#60a5fa' : '#7aa6d8'}
                  rx={1.5}
                />
              ))}
              <text
                x={x + 6}
                y={y + 12}
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
      </svg>
    </div>
  );
}
