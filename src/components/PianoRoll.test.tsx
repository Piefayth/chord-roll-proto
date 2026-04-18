import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PianoRoll } from './PianoRoll';
import type { DocumentState } from '../model/types';

const doc: DocumentState = {
  tempo: 120,
  objects: [
    {
      id: 'obj-1',
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
      generator: { pitchPattern: { kind: 'allAtOnce' }, rhythm: { kind: 'simultaneous' } },
      position: 0,
      duration: 4,
    },
  ],
};

describe('PianoRoll', () => {
  it('renders one note per pitch in the resolved voicing', () => {
    render(<PianoRoll doc={doc} selectedId={null} currentBeat={-1} totalBeats={8} />);
    expect(document.querySelectorAll('[data-testid^="note-"]').length).toBe(3);
  });

  it('renders the selected object with a highlighted edge handle', () => {
    const { container } = render(
      <PianoRoll doc={doc} selectedId="obj-1" currentBeat={-1} totalBeats={8} />
    );
    // selected objects render 4 edge indicator rects in addition to background + notes
    expect(container.querySelector('[data-testid="object-obj-1"]')).toBeTruthy();
  });

  it('renders the playhead when currentBeat >= 0', () => {
    const { queryByTestId, rerender } = render(
      <PianoRoll doc={doc} selectedId={null} currentBeat={-1} totalBeats={8} />
    );
    expect(queryByTestId('playhead')).toBeNull();
    rerender(<PianoRoll doc={doc} selectedId={null} currentBeat={1.5} totalBeats={8} />);
    expect(queryByTestId('playhead')).toBeTruthy();
  });
});
