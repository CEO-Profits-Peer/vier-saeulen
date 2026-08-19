"use client";

import { useState } from "react";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";
import { Plus } from "./Icons";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/date";
import { liveHabits } from "@/lib/score";
import { SEG_KINDS, type FlowRoutine, type SegKind, type Segment } from "@/lib/types";

const EMOJIS = ["⚡", "📚", "🌅", "💸", "🏋️", "🎯", "🧠", "🎬", "🌙", "🔥"];
const KIND_KEYS = Object.keys(SEG_KINDS) as SegKind[];

export function RoutineSheet({ routine, open, onClose }: { routine: FlowRoutine | null; open: boolean; onClose: () => void }) {
  const addRoutine = useStore((s) => s.addRoutine);
  const updateRoutine = useStore((s) => s.updateRoutine);
  const removeRoutine = useStore((s) => s.removeRoutine);
  const habits = liveHabits(useStore((s) => s.data));

  const [name, setName] = useState(routine?.name ?? "");
  const [emoji, setEmoji] = useState(routine?.emoji ?? "⚡");
  const [segments, setSegments] = useState<Segment[]>(
    routine?.segments ?? [{ id: uid(), label: "Lesen", minutes: 15, pillar: "learn", habitId: null }],
  );

  const total = segments.reduce((a, s) => a + s.minutes, 0);
  const patch = (id: string, next: Partial<Segment>) =>
    setSegments((cur) => cur.map((s) => (s.id === id ? { ...s, ...next } : s)));
  const move = (index: number, dir: -1 | 1) =>
    setSegments((cur) => {
      const target = index + dir;
      if (target < 0 || target >= cur.length) return cur;
      const copy = [...cur];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast("Gib der Sequenz einen Namen");
    if (!segments.length) return toast("Mindestens ein Block");
    const clean = segments.map((s) => ({ ...s, label: s.label.trim() || SEG_KINDS[s.pillar].label, minutes: Math.max(1, Math.min(180, s.minutes)) }));
    if (routine) updateRoutine(routine.id, { name: trimmed, emoji, segments: clean });
    else addRoutine({ name: trimmed, emoji, segments: clean });
    haptic("success");
    toast(routine ? "Gespeichert" : "Sequenz angelegt");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={routine ? "Sequenz" : "Neue Sequenz"}
      action={<button className="btn plain" onClick={save} style={{ fontWeight: 700 }}>Sichern</button>}
    >
      <p className="field-label">Name</p>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Power Hour" />

      <p className="field-label" style={{ marginTop: 12 }}>Symbol</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {EMOJIS.map((e) => (
          <button key={e} className="chip" aria-pressed={emoji === e} onClick={() => { setEmoji(e); haptic("tap"); }} style={{ fontSize: 18, minWidth: 46, justifyContent: "center" }}>
            {e}
          </button>
        ))}
      </div>

      <p className="section-title" style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
        <span>Blöcke</span>
        <span className="mono" style={{ textTransform: "none" }}>{total} Min gesamt</span>
      </p>

      {segments.map((s, i) => (
        <div key={s.id} className={`card ${SEG_KINDS[s.pillar].cls}`} style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="dot" />
            <input
              className="field"
              style={{ margin: 0, flex: 1, background: "var(--card-2)" }}
              value={s.label}
              onChange={(e) => patch(s.id, { label: e.target.value })}
              placeholder="Was passiert hier?"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button className="btn" style={{ minHeight: 40, padding: "8px 14px" }} onClick={() => { patch(s.id, { minutes: Math.max(1, s.minutes - 5) }); haptic("tap"); }} aria-label="5 Minuten weniger">−5</button>
            <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 600 }}>{s.minutes} Min</span>
            <button className="btn" style={{ minHeight: 40, padding: "8px 14px" }} onClick={() => { patch(s.id, { minutes: Math.min(180, s.minutes + 5) }); haptic("tap"); }} aria-label="5 Minuten mehr">+5</button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {KIND_KEYS.map((k) => (
              <button key={k} className={`chip pillar ${SEG_KINDS[k].cls}`} aria-pressed={s.pillar === k} onClick={() => { patch(s.id, { pillar: k }); haptic("tap"); }} style={{ fontSize: 13, minHeight: 34, padding: "6px 12px" }}>
                {SEG_KINDS[k].label}
              </button>
            ))}
          </div>

          <select
            className="field"
            style={{ marginTop: 10, marginBottom: 0, background: "var(--card-2)" }}
            value={s.habitId ?? ""}
            onChange={(e) => patch(s.id, { habitId: e.target.value || null })}
          >
            <option value="">Keine Routine verknüpfen</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
            <button className="btn plain" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben">↑</button>
            <button className="btn plain" onClick={() => move(i, 1)} disabled={i === segments.length - 1} aria-label="Nach unten">↓</button>
            <button className="btn plain danger" onClick={() => setSegments((cur) => cur.filter((x) => x.id !== s.id))}>Entfernen</button>
          </div>
        </div>
      ))}

      <button
        className="btn wide"
        onClick={() => {
          setSegments((cur) => [...cur, { id: uid(), label: "Pause", minutes: 5, pillar: "relax", habitId: null }]);
          haptic("tap");
        }}
      >
        <Plus /> Block hinzufügen
      </button>

      <p style={{ fontSize: 13, color: "var(--label-2)", margin: "14px 4px" }}>
        Verknüpfst du einen Block mit einer Routine, hakt die App sie beim Abschluss automatisch im Tag ab.
      </p>

      {routine ? (
        <button className="btn wide danger" onClick={() => { removeRoutine(routine.id); haptic("warn"); toast("Sequenz gelöscht"); onClose(); }}>
          Sequenz löschen
        </button>
      ) : null}
    </Sheet>
  );
}
