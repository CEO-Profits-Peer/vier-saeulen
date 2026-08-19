"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { GoalSheet } from "@/components/GoalSheet";
import { Plus } from "@/components/Icons";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { goalPace, liveGoals } from "@/lib/score";
import { PILLARS, type Goal } from "@/lib/types";

const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export default function GoalsPage() {
  return (
    <Hydrated>
      <Goals />
    </Hydrated>
  );
}

function Goals() {
  const data = useStore((s) => s.data);
  const bumpGoal = useStore((s) => s.bumpGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const goals = liveGoals(data);

  return (
    <>
      <Nav
        title="Ziele"
        subtitle="Eine Zahl, ein Datum — den Rest rechnet die App."
        right={
          <button className="badge tint" onClick={() => { setEditing(null); setOpen(true); haptic("tap"); }}>
            <Plus size={14} /> Neu
          </button>
        }
      />

      {goals.length === 0 ? (
        <div className="empty">Noch kein Ziel. Zwei bis vier reichen — für jede Säule eins.</div>
      ) : null}

      {goals.map((g) => {
        const p = goalPace(g);
        const badge =
          p.status === "done" ? <span className="badge good">erreicht</span>
          : p.status === "over" ? <span className="badge bad">Deadline vorbei</span>
          : p.status === "ok" ? <span className="badge good">im Plan</span>
          : p.status === "warn" ? <span className="badge warn">leicht hinten</span>
          : <span className="badge bad">hinter Plan</span>;
        return (
          <div key={g.id} className={`card ${PILLARS[g.pillar].cls}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--p)" }}>
                  <span className="dot" /> {PILLARS[g.pillar].label.toUpperCase()}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 0", letterSpacing: "-0.02em" }}>{g.title}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {badge}
                <button className="btn plain" onClick={() => { setEditing(g); setOpen(true); haptic("tap"); }} aria-label="Ziel bearbeiten" style={{ color: "var(--label-2)", fontSize: 20 }}>
                  ⋯
                </button>
              </div>
            </div>

            <div className="progress" style={{ marginTop: 14 }}>
              <motion.i initial={false} animate={{ width: `${p.pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "var(--label-2)" }} className="mono">
              <span>{nf.format(g.current)} / {nf.format(g.target)} {g.unit}</span>
              <span>{Math.round(p.pct)} %</span>
            </div>

            <p style={{ fontSize: 13.5, color: "var(--label-2)", margin: "10px 0 0" }}>
              {p.status === "done"
                ? "Fertig. Setz dir das nächste."
                : p.daysLeft < 0
                  ? `Deadline war vor ${Math.abs(p.daysLeft)} Tagen — neu terminieren oder abhaken.`
                  : <>Noch <b style={{ color: "var(--label)" }}>{p.daysLeft}</b> Tage · nötig <b style={{ color: "var(--label)" }}>{nf.format(Math.ceil(p.perWeek * 10) / 10)} {g.unit}</b> pro Woche</>}
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <button className="btn" style={{ minHeight: 40, padding: "8px 14px" }} onClick={() => { bumpGoal(g.id, 1); haptic("tap"); }}>+1</button>
              <button className="btn" style={{ minHeight: 40, padding: "8px 14px" }} onClick={() => { bumpGoal(g.id, 5); haptic("tap"); }}>+5</button>
              <input
                className="field"
                style={{ margin: 0, flex: 1, minWidth: 0, background: "var(--card-2)", minHeight: 40, padding: "8px 12px" }}
                type="number"
                inputMode="decimal"
                placeholder="Stand"
                value={drafts[g.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
              />
              <button
                className="btn"
                style={{ minHeight: 40, padding: "8px 14px" }}
                onClick={() => {
                  const raw = drafts[g.id];
                  if (raw === undefined || raw === "") return toast("Trag erst einen Wert ein");
                  updateGoal(g.id, { current: Number(raw) });
                  setDrafts((d) => ({ ...d, [g.id]: "" }));
                  haptic("success");
                  toast("Stand aktualisiert");
                }}
              >
                setzen
              </button>
            </div>
          </div>
        );
      })}

      {open ? <GoalSheet key={editing?.id ?? "new"} goal={editing} open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
