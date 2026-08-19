"use client";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Muss einmal aus einem echten Tap heraus laufen, sonst bleibt der Browser stumm. */
export function unlockAudio() {
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.01);
}

function tone(freq: number, start: number, duration: number, volume = 0.18) {
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sounds = {
  segmentEnd() {
    tone(660, 0, 0.28);
    tone(880, 0.18, 0.34);
  },
  sessionEnd() {
    tone(523, 0, 0.3);
    tone(659, 0.16, 0.3);
    tone(784, 0.32, 0.5);
  },
  tick() {
    tone(440, 0, 0.12, 0.09);
  },
};
