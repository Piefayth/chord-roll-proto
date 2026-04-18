import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoicingControls } from './VoicingControls';
import type { PitchSet, Voicing } from '../model/types';

const pitchSet: PitchSet = { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' };
const voicing: Voicing = {
  centerNote: 60,
  bottomPitchClass: 0,
  compactness: 0,
  bassSplit: false,
  bassDistance: 1,
  octaveSpan: 1,
  range: [21, 108],
};

describe('VoicingControls', () => {
  it('changes bottomPitchClass when a tone pill is tapped', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={voicing}
        generatorIsSequence={false}
        onChange={onChange}
      />
    );
    // Tones available: C, E, G, B
    await user.click(screen.getByRole('button', { name: 'E' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bottomPitchClass: 4 }));
  });

  it('toggles bassSplit and reveals bass distance stepper', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={voicing}
        generatorIsSequence={false}
        onChange={onChange}
      />
    );
    expect(screen.queryByLabelText('decrease bass distance')).toBeNull();
    await user.click(screen.getByRole('button', { name: /off/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bassSplit: true }));

    rerender(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={{ ...voicing, bassSplit: true }}
        generatorIsSequence={false}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText('decrease bass distance')).toBeInTheDocument();
  });

  it('hides octaveSpan unless generator is a sequence', () => {
    const { rerender } = render(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={voicing}
        generatorIsSequence={false}
        onChange={() => {}}
      />
    );
    expect(screen.queryByLabelText('decrease octave span')).toBeNull();
    rerender(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={voicing}
        generatorIsSequence={true}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('decrease octave span')).toBeInTheDocument();
  });

  it('does not render a Center control (handled by vertical drag on the roll)', () => {
    render(
      <VoicingControls
        pitchSet={pitchSet}
        voicing={voicing}
        generatorIsSequence={false}
        onChange={() => {}}
      />
    );
    expect(screen.queryByLabelText('raise center note')).toBeNull();
    expect(screen.queryByLabelText('center note')).toBeNull();
  });
});
