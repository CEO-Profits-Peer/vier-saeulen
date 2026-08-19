"use client";

import { useEffect } from "react";
import { sounds } from "@/lib/audio";
import { haptic } from "@/lib/haptics";
import { remainingMs } from "@/lib/flow";
import { useStore } from "@/lib/store";
import { useTick } from "@/lib/useTick";
import { useWakeLock } from "@/lib/useWakeLock";

/**
 * Läuft, solange eine Sequenz aktiv ist — auch wenn der Timer minimiert ist
 * oder gerade ein anderer Tab offen steht.
 */
export function FlowEngine() {
  const run = useStore((s) => s.run);
  const routine = useStore((s) => (s.run ? s.data.routines.find((r) => r.id === s.run!.routineId) ?? null : null));
  const advanceRun = useStore((s) => s.advanceRun);

  const seg = run && routine ? routine.segments[run.index] : null;
  const running = Boolean(run && !run.pausedAt);

  useTick(250, running);
  useWakeLock(running);

  useEffect(() => {
    if (!run || !seg || !routine || run.pausedAt) return;
    if (remainingMs(run, seg) > 0) return;
    const isLast = run.index >= routine.segments.length - 1;
    if (isLast) {
      sounds.sessionEnd();
      haptic("transition");
    } else {
      sounds.segmentEnd();
      haptic("success");
    }
    advanceRun();
  });

  return null;
}
