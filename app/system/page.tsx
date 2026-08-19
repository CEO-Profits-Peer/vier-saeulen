"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { HabitSheet } from "@/components/HabitSheet";
import { Chevron, Plus } from "@/components/Icons";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { liveHabits } from "@/lib/score";
import { seedHabits } from "@/lib/seed";
import { ALLDAYS, BKEYS, BLOCKS, DAY_ABBR, PILLARS, WEEKDAYS, type Habit } from "@/lib/types";

function daysLabel(days: number[]) {
  if (days.length === 7) return "täglich";
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return "Mo–Fr";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Wochenende";
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_ABBR[d]).join(" ");
}

export default function SystemPage() {
  return (
    <Hydrated>
      <System />
    </Hydrated>
  );
}

function System() {
  const data = useStore((s) => s.data);
  const addHabit = useStore((s) => s.addHabit);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [open, setOpen] = useState(false);

  const habits = liveHabits(data);
  const points = habits.reduce((a, h) => a + h.pts, 0);

  const loadSeed = () => {
    const have = new Set(habits.map((h) => h.name));
    let added = 0;
    for (const h of seedHabits()) {
      if (have.has(h.name)) continue;
      addHabit({ name: h.name, pillar: h.pillar, block: h.block, pts: h.pts, days: h.days });
      added++;
    }
    haptic("success");
    toast(added ? `${added} Routinen geladen` : "Alles schon da");
  };

  return (
    <>
      <Nav
        title="System"
        subtitle={`${habits.length} Routinen · ${points} Punkte pro voller Woche`}
        right={
          <button className="badge tint" onClick={() => { setEditing(null); setOpen(true); haptic("tap"); }}>
            <Plus size={14} /> Neu
          </button>
        }
      />

      <div className="card">
        <p style={{ margin: 0, fontSize: 15, color: "var(--label-2)" }}>
          Das ist der Bauplan deiner Woche. Ändere alles, bis es zu deinem echten Tag passt — ein System, das du nicht schaffst, ist keins.
        </p>
        {habits.length === 0 ? (
          <button className="btn wide" style={{ marginTop: 14 }} onClick={loadSeed}>
            Startset laden
          </button>
        ) : null}
      </div>

      {BKEYS.map((b) => {
        const list = habits.filter((h) => h.block === b);
        if (!list.length) return null;
        return (
          <div key={b}>
            <p className="section-title">{BLOCKS[b]}</p>
            <div className="group">
              {list.map((h) => (
                <button
                  key={h.id}
                  className={`row tappable ${PILLARS[h.pillar].cls}`}
                  onClick={() => { setEditing(h); setOpen(true); haptic("tap"); }}
                >
                  <span className="dot" />
                  <span className="row-title">
                    {h.name}
                    <span className="row-sub">{daysLabel(h.days)} · {h.pts} Punkte · {PILLARS[h.pillar].label}</span>
                  </span>
                  <span className="chevron"><Chevron /></span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {habits.length ? (
        <button className="btn wide" onClick={loadSeed} style={{ marginBottom: 8 }}>
          Fehlende Startroutinen ergänzen
        </button>
      ) : null}

      <p style={{ fontSize: 13, color: "var(--label-2)", margin: "8px 4px 0" }}>
        Tipp: Neue Routine kommt automatisch für alle Tage rein — {daysLabel(ALLDAYS)}. Stell sie im Bearbeiten-Sheet auf die Tage um, an denen sie realistisch ist.
      </p>

      {open ? <HabitSheet key={editing?.id ?? "new"} habit={editing} open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
