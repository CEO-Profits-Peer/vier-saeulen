import type { RunState, Segment } from "./types";

/** Restzeit aus echten Zeitstempeln — überlebt Hintergrund, Reload und Throttling. */
export function remainingMs(run: RunState, seg: Segment) {
  const now = Date.now();
  const pausedNow = run.pausedAt ? now - run.pausedAt : 0;
  const elapsed = now - run.segmentStartedAt - run.pausedTotal - pausedNow;
  return seg.minutes * 60000 - elapsed;
}
