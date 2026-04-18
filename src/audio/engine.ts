import * as Tone from 'tone';
import type { RenderedNote } from '../model/types';

let synth: Tone.PolySynth | null = null;
let part: Tone.Part | null = null;
let initialized = false;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export async function ensureAudio(): Promise<void> {
  if (initialized) return;
  await Tone.start();
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 },
  }).toDestination();
  synth.volume.value = -10;
  initialized = true;
}

export function setTempo(bpm: number) {
  Tone.getTransport().bpm.value = bpm;
}

interface ScheduleOptions {
  notes: RenderedNote[];
  loopBeats: number;
  bpm: number;
}

export function schedule({ notes, loopBeats, bpm }: ScheduleOptions) {
  if (!synth) return;
  setTempo(bpm);
  if (part) {
    part.stop();
    part.dispose();
    part = null;
  }
  const secPerBeat = 60 / bpm;
  type NoteValue = { pitch: number; duration: number; velocity: number };
  part = new Tone.Part<NoteValue>(
    (time, value) => {
      const v = value as NoteValue;
      const durSec = Math.max(0.05, v.duration * secPerBeat);
      synth!.triggerAttackRelease(midiToFreq(v.pitch), durSec, time, v.velocity);
    },
    notes.map((n) => ({
      time: n.onset * secPerBeat,
      pitch: n.pitch,
      duration: n.duration,
      velocity: n.velocity,
    }))
  );
  part.loop = true;
  part.loopEnd = loopBeats * (60 / bpm);
  part.start(0);
}

export function play() {
  Tone.getTransport().start();
}

export function stop() {
  Tone.getTransport().stop();
  Tone.getTransport().position = 0;
}

export function isPlaying() {
  return Tone.getTransport().state === 'started';
}
