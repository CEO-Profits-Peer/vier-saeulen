"use client";

import { useState } from "react";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { addDays, dkey, todayKey } from "@/lib/date";
import { PILLARS, PKEYS, type Goal, type Pillar } from "@/lib/types";

export function GoalSheet({ goal, open, onClose }: { goal: Goal | null; open: boolean; onClose: () => void }) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const removeGoal = useStore((s) => s.removeGoal);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [pillar, setPillar] = useState<Pillar>(goal?.pillar ?? "money");
  const [target, setTarget] = useState(String(goal?.target ?? 100));
  const [unit, setUnit] = useState(goal?.unit ?? "x");
  const [current, setCurrent] = useState(String(goal?.current ?? 0));
  const [due, setDue] = useState(goal?.due ?? dkey(addDays(new Date(), 90)));

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return toast("Gib dem Ziel einen Namen");
    const patch = {
      title: trimmed,
      pillar,
      target: Number(target) || 0,
      unit: unit.trim(),
      current: Number(current) || 0,
      due: due || dkey(addDays(new Date(), 90)),
    };
    if (goal) updateGoal(goal.id, patch);
    else addGoal({ ...patch, created: todayKey() });
    haptic("success");
    toast(goal ? "Gespeichert" : "Ziel angelegt");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Ziel" : "Neues Ziel"}
      action={<button className="btn plain" onClick={save} style={{ fontWeight: 700 }}>Sichern</button>}
    >
      <p className="field-label">Ziel</p>
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. 1.000 $ gespart" />

      <p className="field-label" style={{ marginTop: 12 }}>Säule</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PKEYS.map((p) => (
          <button key={p} className={`chip pillar ${PILLARS[p].cls}`} aria-pressed={pillar === p} onClick={() => { setPillar(p); haptic("tap"); }}>
            <span className="dot" style={{ background: pillar === p ? "#fff" : "var(--p)" }} />
            {PILLARS[p].label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <div>
          <p className="field-label">Zielwert</p>
          <input className="field" type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div>
          <p className="field-label">Einheit</p>
          <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="$ / h / x" />
        </div>
        <div>
          <p className="field-label">Aktuell</p>
          <input className="field" type="number" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <p className="field-label">Deadline</p>
          <input className="field" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--label-2)", margin: "4px 4px 16px" }}>
        Ohne Zahl und Datum ist es ein Wunsch, kein Ziel. 90 Tage sind ein gutes Fenster.
      </p>

      {goal ? (
        <button className="btn wide danger" onClick={() => { removeGoal(goal.id); haptic("warn"); toast("Ziel gelöscht"); onClose(); }}>
          Ziel löschen
        </button>
      ) : null}
    </Sheet>
  );
}
