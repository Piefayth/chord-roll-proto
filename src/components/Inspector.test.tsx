import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentProvider, useDocument } from '../state/document';
import { Inspector } from './Inspector';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <DocumentProvider>{children}</DocumentProvider>;
}

function RemoveProbe() {
  const { doc } = useDocument();
  return <div data-testid="object-count">{doc.objects.length}</div>;
}

describe('Inspector', () => {
  it('shows empty state when nothing is selected', () => {
    function Clear() {
      const { setSelectedId } = useDocument();
      // Immediately clear selection on mount.
      setSelectedId(null);
      return null;
    }
    render(
      <Wrapper>
        <Clear />
        <Inspector />
      </Wrapper>
    );
    expect(screen.getByText(/Tap empty space/)).toBeInTheDocument();
  });

  it('deletes the selected object via the Delete button', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <RemoveProbe />
        <Inspector />
      </Wrapper>
    );
    expect(screen.getByTestId('object-count').textContent).toBe('1');
    await user.click(screen.getByRole('button', { name: /delete selected object/i }));
    expect(screen.getByTestId('object-count').textContent).toBe('0');
  });
});
