"use client";

import { useState } from "react";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { ALLDAYS, BKEYS, BLOCKS, DAY_ABBR, PILLARS, PKEYS, WEEKDAYS, type Block, type Habit, type Pillar } from "@/lib/types";

export function HabitSheet({ habit, open, onClose }: { habit: Habit | null; open: boolean; onClose: () => void }) {
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const removeHabit = useStore((s) => s.removeHabit);

  const [name, setName] = useState(habit?.name ?? "");
  const [pillar, setPillar] = useState<Pillar>(habit?.pillar ?? "learn");
  const [block, setBlock] = useState<Block>(habit?.block ?? "morning");
  const [days, setDays] = useState<number[]>(habit?.days ?? ALLDAYS);
  const [pts, setPts] = useState(String(habit?.pts ?? 10));

  const toggleDay = (d: number) => {
    haptic("tap");
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast("Gib der Routine einen Namen");
    if (!days.length) return toast("Wähl mindestens einen Tag");
    const points = Math.max(1, Math.min(50, Number(pts) || 5));
    if (habit) updateHabit(habit.id, { name: trimmed, pillar, block, days, pts: points });
    else addHabit({ name: trimmed, pillar, block, days, pts: points });
    haptic("success");
    toast(habit ? "Gespeichert" : "Routine angelegt");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? "Routine" : "Neue Routine"}
      action={
        <button className="btn plain" onClick={save} style={{ fontWeight: 700 }}>
          Sichern
        </button>
      }
    >
      <p className="field-label">Was machst du?</p>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. 30 Min Skill üben" autoFocus={!habit} />

      <p className="field-label" style={{ marginTop: 14 }}>Säule</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PKEYS.map((p) => (
          <button key={p} className={`chip pillar ${PILLARS[p].cls}`} aria-pressed={pillar === p} onClick={() => { setPillar(p); haptic("tap"); }}>
            <span className="dot" style={{ background: pillar === p ? "#fff" : "var(--p)" }} />
            {PILLARS[p].label}
          </button>
        ))}
      </div>

      <p className="field-label" style={{ marginTop: 16 }}>Tageszeit</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {BKEYS.map((b) => (
          <button key={b} className="chip" aria-pressed={block === b} onClick={() => { setBlock(b); haptic("tap"); }}>
            {BLOCKS[b]}
          </button>
        ))}
      </div>

      <p className="field-label" style={{ marginTop: 16 }}>An welchen Tagen?</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} className="chip" style={{ minWidth: 46, justifyContent: "center" }} aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>
            {DAY_ABBR[d]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn plain" onClick={() => setDays(ALLDAYS)}>täglich</button>
        <button className="btn plain" onClick={() => setDays(WEEKDAYS)}>Mo–Fr</button>
        <button className="btn plain" onClick={() => setDays([6, 0])}>Sa+So</button>
      </div>

      <p className="field-label" style={{ marginTop: 16 }}>Punkte — wie schwer ist das?</p>
      <input className="field" type="number" inputMode="numeric" min={1} max={50} value={pts} onChange={(e) => setPts(e.target.value)} />
      <p style={{ fontSize: 13, color: "var(--label-2)", margin: "0 4px 16px" }}>
        Training oder Hausaufgaben dürfen 15 zählen, ein Glas Wasser 5. Der Tagesscore ist der Anteil der Punkte, die du geholt hast.
      </p>

      {habit ? (
        <button
          className="btn wide danger"
          onClick={() => {
            removeHabit(habit.id);
            haptic("warn");
            toast("Routine gelöscht");
            onClose();
          }}
        >
          Routine löschen
        </button>
      ) : null}
    </Sheet>
  );
}
