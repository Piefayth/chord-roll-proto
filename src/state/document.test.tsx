import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DocumentProvider, useDocument } from './document';
import type { PitchSet } from '../model/types';

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

  it('updatePitchSet resets topTrim and bottomTrim on the object', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const id = result.current.doc.objects[0].id;
    act(() => result.current.updateObject(id, { topTrim: 1, bottomTrim: 1 }));
    expect(result.current.doc.objects[0].topTrim).toBe(1);
    const next: PitchSet = { rootPC: 0, intervals: [0, 4, 7], name: 'C' };
    act(() => result.current.updatePitchSet(id, next));
    const obj = result.current.doc.objects[0];
    expect(obj.pitchSet).toEqual(next);
    expect(obj.topTrim).toBe(0);
    expect(obj.bottomTrim).toBe(0);
  });

  it('persists the document to localStorage and restores it on next mount', () => {
    const first = renderHook(() => useDocument(), { wrapper });
    const id = first.result.current.doc.objects[0].id;
    act(() => first.result.current.updateObject(id, { duration: 7 }));
    first.unmount();

    const second = renderHook(() => useDocument(), { wrapper });
    expect(second.result.current.doc.objects[0].id).toBe(id);
    expect(second.result.current.doc.objects[0].duration).toBe(7);
  });

  it('copy + paste with a selection places the clone at the selected object\'s position', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const selId = result.current.doc.objects[0].id;
    // Move the selected one to position 6, then copy and paste.
    act(() => result.current.updateObject(selId, { position: 6, duration: 4 }));
    act(() => result.current.setSelectedId(selId));
    act(() => result.current.copySelected());
    expect(result.current.clipboardSize).toBe(1);
    act(() => result.current.paste());
    // New object exists with position 6.
    const pasted = result.current.doc.objects.find((o) => o.id !== selId);
    expect(pasted).toBeDefined();
    expect(pasted!.position).toBe(6);
    // Selection moved to the pasted object.
    expect(result.current.selectedId).toBe(pasted!.id);
  });

  it('paste with nothing selected appends after the last object\'s right edge', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const selId = result.current.doc.objects[0].id;
    act(() => result.current.updateObject(selId, { position: 0, duration: 4 }));
    act(() => result.current.setSelectedId(selId));
    act(() => result.current.copySelected());
    act(() => result.current.setSelectedId(null));
    act(() => result.current.paste());
    const pasted = result.current.doc.objects.find((o) => o.id !== selId);
    expect(pasted!.position).toBe(4);
  });

  it('paste is a no-op when clipboard is empty', () => {
    const { result } = renderHook(() => useDocument(), { wrapper });
    const countBefore = result.current.doc.objects.length;
    act(() => result.current.paste());
    expect(result.current.doc.objects.length).toBe(countBefore);
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
