"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Ring } from "./Ring";
import { Forward, Pause, Play, Stop } from "./Icons";
import { toast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { remainingMs } from "@/lib/flow";
import { useStore } from "@/lib/store";
import { useTick } from "@/lib/useTick";
import { fmtClock } from "@/lib/date";
import { SEG_KINDS } from "@/lib/types";

export function FlowRunner() {
  const run = useStore((s) => s.run);
  const data = useStore((s) => s.data);
  const pauseRun = useStore((s) => s.pauseRun);
  const resumeRun = useStore((s) => s.resumeRun);
  const advanceRun = useStore((s) => s.advanceRun);
  const stopRun = useStore((s) => s.stopRun);
  const setRunMinimized = useStore((s) => s.setRunMinimized);
  const [confirmStop, setConfirmStop] = useState(false);

  const routine = run ? data.routines.find((r) => r.id === run.routineId) : null;
  const seg = routine && run ? routine.segments[run.index] : null;
  useTick(250, Boolean(run));

  if (!run || !routine || !seg) return null;

  const remaining = Math.max(0, remainingMs(run, seg));
  const pct = 100 - (remaining / (seg.minutes * 60000)) * 100;
  const next = routine.segments[run.index + 1];
  const kind = SEG_KINDS[seg.pillar];

  return (
    <motion.div
      className={kind.cls}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        padding: "calc(env(safe-area-inset-top) + 20px) 20px calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          className="btn"
          onClick={() => { setRunMinimized(true); haptic("tap"); }}
          style={{ width: 38, height: 38, borderRadius: "50%", padding: 0, flex: "none" }}
          aria-label="Sequenz in den Hintergrund"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 7 6-7" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--label-2)", letterSpacing: "0.06em" }}>
            {routine.emoji} {routine.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: "var(--label-2)", marginTop: 2 }} className="mono">
            Block {run.index + 1} von {routine.segments.length}
          </div>
        </div>
        <button className="btn plain" onClick={() => setConfirmStop(true)} style={{ color: "var(--label-2)" }}>
          Beenden
        </button>
      </div>

      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Ring pct={pct} color="var(--p)" size={264} stroke={14} track="var(--fill)">
            <div>
              <div className="mono" style={{ fontSize: 62, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {fmtClock(remaining)}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8, color: "var(--p)" }}>{seg.label}</div>
              <div style={{ fontSize: 13, color: "var(--label-2)", marginTop: 2 }}>{kind.label} · {seg.minutes} Min</div>
            </div>
          </Ring>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 26 }}>
            {routine.segments.map((s, i) => (
              <span
                key={s.id}
                className={SEG_KINDS[s.pillar].cls}
                style={{
                  width: i === run.index ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i <= run.index ? "var(--p)" : "var(--fill-2)",
                  transition: "width .3s ease",
                }}
              />
            ))}
          </div>

          <div style={{ marginTop: 20, fontSize: 14, color: "var(--label-2)" }}>
            {next ? <>Danach: <b style={{ color: "var(--label)" }}>{next.label}</b> · {next.minutes} Min</> : "Letzter Block"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
        <button
          className="btn"
          onClick={() => {
            advanceRun({ skipped: true });
            haptic("tap");
            toast("Block übersprungen");
          }}
          style={{ width: 62, height: 62, borderRadius: "50%", padding: 0 }}
          aria-label="Block überspringen"
        >
          <Forward />
        </button>
        <button
          className="btn filled"
          onClick={() => {
            if (run.pausedAt) resumeRun();
            else pauseRun();
            haptic("tap");
          }}
          style={{ width: 86, height: 86, borderRadius: "50%", padding: 0, background: "var(--p)" }}
          aria-label={run.pausedAt ? "Fortsetzen" : "Pause"}
        >
          {run.pausedAt ? <Play size={30} /> : <Pause size={30} />}
        </button>
        <button
          className="btn"
          onClick={() => setConfirmStop(true)}
          style={{ width: 62, height: 62, borderRadius: "50%", padding: 0, color: "var(--red)" }}
          aria-label="Sequenz beenden"
        >
          <Stop />
        </button>
      </div>

      <AnimatePresence>
        {confirmStop ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", padding: 24 }}
            onClick={(e) => e.target === e.currentTarget && setConfirmStop(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              style={{ background: "var(--bg-elevated)", borderRadius: 18, padding: 20, width: "100%", maxWidth: 340 }}
            >
              <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Sequenz beenden?</h2>
              <p style={{ fontSize: 14, color: "var(--label-2)", margin: "0 0 18px" }}>
                Die Minuten bis hierher werden gutgeschrieben.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  className="btn wide filled"
                  onClick={() => {
                    stopRun(true);
                    haptic("warn");
                    setConfirmStop(false);
                    toast("Sequenz beendet");
                  }}
                >
                  Beenden und gutschreiben
                </button>
                <button className="btn wide" onClick={() => setConfirmStop(false)}>Weitermachen</button>
                <button
                  className="btn wide danger"
                  onClick={() => {
                    stopRun(false);
                    setConfirmStop(false);
                  }}
                >
                  Verwerfen
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
