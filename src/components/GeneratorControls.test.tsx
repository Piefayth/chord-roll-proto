import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratorControls } from './GeneratorControls';
import type { Generator } from '../model/types';

const block: Generator = {
  pitchPattern: { kind: 'allAtOnce' },
  rhythm: { kind: 'simultaneous' },
};

describe('GeneratorControls', () => {
  it('switches to strum/cascade pattern', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneratorControls generator={block} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'strum' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.pitchPattern.kind).toBe('cascadeInOrder');
  });

  it('reveals offset slider when rhythm is cascade', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<GeneratorControls generator={block} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'cascade' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.rhythm.kind).toBe('cascade');
    rerender(<GeneratorControls generator={next} onChange={onChange} />);
    expect(screen.getByLabelText('cascade offset ms')).toBeInTheDocument();
  });

  it('switches to seq pattern and shows degree chips', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<GeneratorControls generator={block} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'seq' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.pitchPattern).toEqual({ kind: 'degreeSequence', degrees: [0, 2, 1, 2] });
    rerender(<GeneratorControls generator={next} onChange={onChange} />);
    expect(screen.getByText('Degrees')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/decrease degree/i).length).toBe(4);
  });

  it('toggles a step grid cell', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const grid: Generator = {
      pitchPattern: { kind: 'cycle' },
      rhythm: {
        kind: 'stepGrid',
        resolutionBeats: 0.25,
        cells: [false, false, false, false],
      },
    };
    render(<GeneratorControls generator={grid} onChange={onChange} />);
    await user.click(screen.getByLabelText('cell 0'));
    const next = onChange.mock.calls[0][0] as Generator;
    if (next.rhythm.kind !== 'stepGrid') throw new Error('expected stepGrid');
    expect(next.rhythm.cells[0]).toBe(true);
  });
});
