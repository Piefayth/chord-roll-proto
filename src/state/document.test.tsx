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

  it('creates new objects with the requested position', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    act(() => {
      result.current.createObject(8);
    });
    const created = result.current.doc.objects[result.current.doc.objects.length - 1];
    expect(created.position).toBe(8);
    expect(result.current.selectedId).toBe(created.id);
  });

  it('removes objects and clears selection when removed id was selected', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const id = result.current.doc.objects[0].id;
    act(() => result.current.setSelectedId(id));
    act(() => result.current.removeObject(id));
    expect(result.current.doc.objects.find((o) => o.id === id)).toBeUndefined();
    expect(result.current.selectedId).toBeNull();
  });

  it('cycleSelectAt picks the first hit, then advances on repeated taps', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    // Add a second overlapping object.
    act(() => {
      result.current.createObject(0);
    });
    const [a, b] = result.current.doc.objects;
    // Tap near beat 1, pitch 60 (both overlap positions 0..4).
    act(() => result.current.cycleSelectAt(1, 60));
    const first = result.current.selectedId;
    expect(first === a.id || first === b.id).toBe(true);
    // Same spot: advance.
    act(() => result.current.cycleSelectAt(1, 60));
    const second = result.current.selectedId;
    expect(second).not.toBe(first);
  });
});
