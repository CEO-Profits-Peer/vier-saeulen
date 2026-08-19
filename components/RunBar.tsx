"use client";

import { motion } from "motion/react";
import { Pause, Play } from "./Icons";
import { remainingMs } from "@/lib/flow";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { useTick } from "@/lib/useTick";
import { fmtClock } from "@/lib/date";
import { SEG_KINDS } from "@/lib/types";

/** Läuft eine Sequenz im Hintergrund, bleibt sie über der Tab-Leiste sichtbar — wie „Aktuelles Medium". */
export function RunBar() {
  const run = useStore((s) => s.run);
  const data = useStore((s) => s.data);
  const setRunMinimized = useStore((s) => s.setRunMinimized);
  const pauseRun = useStore((s) => s.pauseRun);
  const resumeRun = useStore((s) => s.resumeRun);
  useTick(500, Boolean(run));

  const routine = run ? data.routines.find((r) => r.id === run.routineId) : null;
  const seg = routine && run ? routine.segments[run.index] : null;
  if (!run || !routine || !seg) return null;

  const remaining = Math.max(0, remainingMs(run, seg));
  const pct = 100 - (remaining / (seg.minutes * 60000)) * 100;

  return (
    <motion.div
      className={SEG_KINDS[seg.pillar].cls}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        bottom: "calc(var(--tabbar) + env(safe-area-inset-bottom) + 8px)",
        zIndex: 45,
        maxWidth: 624,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          background: "color-mix(in srgb, var(--bg-elevated) 92%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.5px solid var(--separator)",
          borderRadius: 16,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 24px -12px rgba(0,0,0,.4)",
        }}
      >
        <button
          onClick={() => { setRunMinimized(false); haptic("tap"); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, textAlign: "left", minWidth: 0 }}
          aria-label="Sequenz öffnen"
        >
          <span style={{ fontSize: 18 }}>{routine.emoji}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {seg.label}
            </span>
            <span style={{ display: "block", height: 3, borderRadius: 999, background: "var(--fill)", marginTop: 5, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--p)", borderRadius: 999 }} />
            </span>
          </span>
          <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{fmtClock(remaining)}</span>
        </button>
        <button
          className="btn"
          style={{ width: 40, height: 40, borderRadius: "50%", padding: 0, background: "var(--p)", color: "#fff" }}
          onClick={() => { run.pausedAt ? resumeRun() : pauseRun(); haptic("tap"); }}
          aria-label={run.pausedAt ? "Fortsetzen" : "Pause"}
        >
          {run.pausedAt ? <Play size={17} /> : <Pause size={17} />}
        </button>
      </div>
    </motion.div>
  );
}
