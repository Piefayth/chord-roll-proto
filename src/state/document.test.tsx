import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DocumentProvider, useDocument } from './document';

function wrapper({ children }: { children: React.ReactNode }) {
  return <DocumentProvider>{children}</DocumentProvider>;
}

describe('DocumentProvider', () => {
  it('updates an object via patch', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const id = result.current.doc.objects[0].id;
    act(() => result.current.updateObject(id, { duration: 8 }));
    expect(result.current.doc.objects[0].duration).toBe(8);
  });

  it('updates tempo', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    act(() => result.current.setTempo(90));
    expect(result.current.doc.tempo).toBe(90);
  });

  it('preserves immutability of unrelated fields', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const id = result.current.doc.objects[0].id;
    const before = result.current.doc.objects[0].pitchSet;
    act(() => result.current.updateObject(id, { duration: 2 }));
    expect(result.current.doc.objects[0].pitchSet).toBe(before);
  });
});
