"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { isoWeek } from "@/lib/date";
import { useStore } from "@/lib/store";
import { MAX_WEEK_PLANS } from "@/lib/types";

/** Bis zu drei Schwerpunkte für die Woche. Sie stehen auf „Heute“, damit die
 *  Ziele nicht nur auf ihrer eigenen Seite leben, sondern im Alltag auftauchen.
 *
 *  Bewusst ohne Abhaken: das sind Richtungen, keine Aufgaben — dafür gibt es
 *  Routinen und „Heute extra“.
 */
export function WeekPlan({ compact = false }: { compact?: boolean }) {
  const weeks = useStore((s) => s.data.weeks);
  const setWeek = useStore((s) => s.setWeek);
  const wk = isoWeek(new Date());
  const plans = weeks[wk]?.plans ?? [];

  const [editing, setEditing] = useState(false);
  const filled = plans.filter((p) => p.trim());

  const write = (index: number, value: string) => {
    const next = Array.from({ length: MAX_WEEK_PLANS }, (_, i) => (i === index ? value : (plans[i] ?? "")));
    setWeek({ plans: next });
  };

  if (compact && !filled.length && !editing) {
    return (
      <button
        className="row tappable"
        onClick={() => { setEditing(true); haptic("tap"); }}
        style={{ borderRadius: "var(--radius)", background: "var(--card)", marginBottom: 16 }}
      >
        <span className="row-title" style={{ color: "var(--tint)" }}>
          Schwerpunkte für diese Woche setzen
          <span className="row-sub">Drei Richtungen, die diese Woche zählen</span>
        </span>
      </button>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editing ? 10 : 6 }}>
        <p className="field-label" style={{ margin: 0 }}>Diese Woche</p>
        <button className="btn plain" style={{ minHeight: 28 }} onClick={() => { setEditing((v) => !v); haptic("tap"); }}>
          {editing ? "Fertig" : "Ändern"}
        </button>
      </div>

      {editing ? (
        Array.from({ length: MAX_WEEK_PLANS }, (_, i) => (
          <input
            key={i}
            className="field"
            value={plans[i] ?? ""}
            maxLength={60}
            placeholder={`Schwerpunkt ${i + 1}`}
            aria-label={`Schwerpunkt ${i + 1}`}
            onChange={(e) => write(i, e.target.value)}
            style={{ marginBottom: i === MAX_WEEK_PLANS - 1 ? 0 : 10 }}
          />
        ))
      ) : filled.length ? (
        <ol style={{ margin: 0, padding: "0 0 0 20px", display: "grid", gap: 6 }}>
          {filled.map((p, i) => (
            <li key={i} style={{ fontSize: 15 }}>{p}</li>
          ))}
        </ol>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: "var(--label-2)" }}>
          Noch nichts gesetzt — drei Richtungen reichen.
        </p>
      )}
    </div>
  );
}
