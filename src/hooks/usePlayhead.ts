import { useEffect, useState } from 'react';
import * as Tone from 'tone';

// Subscribe to Tone.Transport position; returns current beat (looped).
// Runs only while transport is started.
export function usePlayhead(loopBeats: number, isPlaying: boolean): number {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!isPlaying) {
      setBeat(0);
      return;
    }
    let raf = 0;
    const loop = () => {
      const transport = Tone.getTransport();
      const bpm = transport.bpm.value;
      const secs = transport.seconds;
      const b = (secs * bpm) / 60;
      const wrapped = loopBeats > 0 ? b % loopBeats : b;
      setBeat(wrapped);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, loopBeats]);
  return beat;
}
