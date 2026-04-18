import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    render(<PianoRoll doc={doc} selectedId={null} totalBeats={8} />);
    // C major triad: 3 notes
    expect(document.querySelectorAll('[data-testid^="note-"]').length).toBe(3);
  });

  it('selects an object when its region is tapped', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PianoRoll doc={doc} selectedId={null} onSelect={onSelect} totalBeats={8} />);
    await user.click(screen.getByTestId('object-obj-1'));
    expect(onSelect).toHaveBeenCalledWith('obj-1');
  });
});
