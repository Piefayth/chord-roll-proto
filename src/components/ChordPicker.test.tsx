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
    const { container } = render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    // The Extensions row has the 9-labeled pill with aria-pressed.
    const nineButtons = Array.from(container.querySelectorAll('button'))
      .filter((b) => b.textContent === '9' && b.hasAttribute('aria-pressed'));
    expect(nineButtons.length).toBe(1);
    await user.click(nineButtons[0]);
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toContain(14);
  });

  it('toggles a ♭9 extension', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '♭9' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toContain(13);
  });

  it('toggles a #11 extension', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '#11' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toContain(18);
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

  it('applies a scale preset (mixolydian)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'mix' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toEqual([0, 2, 4, 5, 7, 9, 10]);
  });

  it('applies a pentatonic minor scale', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChordPicker pitchSet={initial} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'pent min' }));
    const next = onChange.mock.calls[0][0] as PitchSet;
    expect(next.intervals).toEqual([0, 3, 5, 7, 10]);
  });
});
