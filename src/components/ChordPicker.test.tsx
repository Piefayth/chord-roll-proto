import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChordPicker } from './ChordPicker';
import type { PitchSet } from '../model/types';

const initial: PitchSet = { rootPC: 0, intervals: [0, 4, 7, 11], name: 'Cmaj7' };

describe('ChordPicker', () => {
  it('renders the current chord name', () => {
    render(<ChordPicker pitchSet={initial} onChange={() => {}} />);
    expect(screen.getByText('Cmaj7')).toBeInTheDocument();
  });

  it('changes root and re-derives the chord name', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getAllByText('D')[0]);
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.rootPC).toBe(2);
    expect(next.name.startsWith('D')).toBe(true);
  });

  it('toggles a 9th extension', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '9' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toContain(14);
  });

  it('applies a shape preset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'm7' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toEqual([0, 3, 7, 10]);
    expect(next.name).toBe('Cm7');
  });
});
