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
    render(<GeneratorControls generator={block} voiceCount={4} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'strum' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.pitchPattern.kind).toBe('cascadeInOrder');
  });

  it('reveals offset slider when rhythm is cascade', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <GeneratorControls generator={block} voiceCount={4} onChange={onChange} />
    );
    await user.click(screen.getByRole('radio', { name: 'cascade' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.rhythm.kind).toBe('cascade');
    rerender(<GeneratorControls generator={next} voiceCount={4} onChange={onChange} />);
    expect(screen.getByLabelText('cascade offset ms')).toBeInTheDocument();
  });

  it('switches to seq pattern and shows the degree grid', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <GeneratorControls generator={block} voiceCount={4} onChange={onChange} />
    );
    await user.click(screen.getByRole('radio', { name: 'seq' }));
    const next = onChange.mock.calls[0][0] as Generator;
    expect(next.pitchPattern).toEqual({ kind: 'degreeSequence', degrees: [0, 2, 1, 2] });
    rerender(<GeneratorControls generator={next} voiceCount={4} onChange={onChange} />);
    expect(screen.getByLabelText('degree grid')).toBeInTheDocument();
    // 4 steps x 4 rows = 16 cells
    expect(screen.getAllByRole('button', { name: /^step \d+ voice \d+$/ })).toHaveLength(16);
  });

  it('tapping a grid cell sets that step to that voice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const seq: Generator = {
      pitchPattern: { kind: 'degreeSequence', degrees: [0, 0, 0, 0] },
      rhythm: { kind: 'periodic', rateBeats: 0.25 },
    };
    render(<GeneratorControls generator={seq} voiceCount={4} onChange={onChange} />);
    await user.click(screen.getByLabelText('step 1 voice 3'));
    const next = onChange.mock.calls[0][0] as Generator;
    if (next.pitchPattern.kind !== 'degreeSequence') throw new Error();
    expect(next.pitchPattern.degrees).toEqual([0, 3, 0, 0]);
  });

  it('applies the up preset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const seq: Generator = {
      pitchPattern: { kind: 'degreeSequence', degrees: [0, 2, 1, 2] },
      rhythm: { kind: 'periodic', rateBeats: 0.25 },
    };
    render(<GeneratorControls generator={seq} voiceCount={4} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'up' }));
    const next = onChange.mock.calls[0][0] as Generator;
    if (next.pitchPattern.kind !== 'degreeSequence') throw new Error();
    expect(next.pitchPattern.degrees).toEqual([0, 1, 2, 3]);
  });

  it('length stepper adds and removes steps', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const seq: Generator = {
      pitchPattern: { kind: 'degreeSequence', degrees: [0, 1, 2, 3] },
      rhythm: { kind: 'periodic', rateBeats: 0.25 },
    };
    const { rerender } = render(
      <GeneratorControls generator={seq} voiceCount={4} onChange={onChange} />
    );
    await user.click(screen.getByLabelText('longer sequence'));
    let next = onChange.mock.calls[0][0] as Generator;
    if (next.pitchPattern.kind !== 'degreeSequence') throw new Error();
    expect(next.pitchPattern.degrees).toHaveLength(5);

    onChange.mockClear();
    rerender(<GeneratorControls generator={seq} voiceCount={4} onChange={onChange} />);
    await user.click(screen.getByLabelText('shorter sequence'));
    next = onChange.mock.calls[0][0] as Generator;
    if (next.pitchPattern.kind !== 'degreeSequence') throw new Error();
    expect(next.pitchPattern.degrees).toHaveLength(3);
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
    render(<GeneratorControls generator={grid} voiceCount={4} onChange={onChange} />);
    await user.click(screen.getByLabelText('cell 0'));
    const next = onChange.mock.calls[0][0] as Generator;
    if (next.rhythm.kind !== 'stepGrid') throw new Error('expected stepGrid');
    expect(next.rhythm.cells[0]).toBe(true);
  });
});
