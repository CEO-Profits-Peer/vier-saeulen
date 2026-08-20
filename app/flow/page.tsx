"use client";

import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Suspense, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { RoutineSheet } from "@/components/RoutineSheet";
import { Play, Plus } from "@/components/Icons";
import { toast } from "@/components/Toast";
import { unlockAudio } from "@/lib/audio";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { liveRoutines } from "@/lib/score";
import { decodeRoutine, routineLink } from "@/lib/share";
import { SEG_KINDS, type FlowRoutine } from "@/lib/types";

export default function FlowPage() {
  return (
    <Hydrated>
      <Suspense fallback={null}>
        <Flow />
      </Suspense>
    </Hydrated>
  );
}

function Flow() {
  const t = useT();
  const params = useSearchParams();
  const data = useStore((s) => s.data);
  const run = useStore((s) => s.run);
  const startRun = useStore((s) => s.startRun);
  const addSeedRoutines = useStore((s) => s.addSeedRoutines);
  const [editing, setEditing] = useState<FlowRoutine | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const addRoutine = useStore((s) => s.addRoutine);

  /* Geteilte Sequenz aus dem Link. Der Code wird beim Dekodieren validiert;
     trägt er nicht, passiert nichts außer einem Hinweis. Danach wird der
     Parameter aus der Adresse genommen, damit ein Reload nicht doppelt anlegt. */
  useEffect(() => {
    const code = params.get("v");
    if (!code) return;
    const parsed = decodeRoutine(code);
    if (parsed) {
      addRoutine(parsed);
      haptic("success");
      toast(t.flow.imported(parsed.name));
    } else {
      toast(t.flow.importBroken);
    }
    window.history.replaceState({}, "", "/flow");
  }, [params, addRoutine]);

  const routines = liveRoutines(data);
  const sessions = [...data.sessions].reverse().slice(0, 6);

  const start = (id: string) => {
    unlockAudio();
    startRun(id);
    haptic("transition");
  };

  /* Schnellstart von der Heute-Seite */
  const startId = params.get("start");
  useEffect(() => {
    if (!startId || run) return;
    if (!routines.some((r) => r.id === startId)) return;
    start(startId);
    window.history.replaceState(null, "", "/flow");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId]);

  return (
    <>
      <Nav
        title="Flow"
        subtitle={t.flow.subtitle}
        right={
          <button className="badge tint" onClick={() => { setEditing(null); setSheetOpen(true); haptic("tap"); }}>
            <Plus size={14} /> Neu
          </button>
        }
      />

      {routines.length === 0 ? (
        <div className="empty">
          Keine Sequenzen.
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => { addSeedRoutines(); toast("Vorlagen geladen"); }}>Vorlagen laden</button>
          </div>
        </div>
      ) : null}

      {routines.map((r) => {
        const total = r.segments.reduce((a, s) => a + s.minutes, 0);
        return (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>{r.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 13, color: "var(--label-2)" }} className="mono">
                  {r.segments.length} Blöcke · {total} Min
                </div>
              </div>
              <button
                className="btn filled"
                style={{ width: 52, height: 52, borderRadius: "50%", padding: 0 }}
                onClick={() => start(r.id)}
                aria-label={`${r.name} starten`}
              >
                <Play size={22} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 3, marginTop: 12, height: 8 }}>
              {r.segments.map((s) => (
                <span
                  key={s.id}
                  className={SEG_KINDS[s.pillar].cls}
                  title={`${s.label} · ${s.minutes} Min`}
                  style={{ flex: s.minutes, background: "var(--p)", borderRadius: 999, opacity: s.pillar === "relax" ? 0.45 : 1 }}
                />
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, fontSize: 13, color: "var(--label-2)" }}>
              {r.segments.map((s, i) => (
                <span key={s.id}>
                  {s.label} {s.minutes}′{i < r.segments.length - 1 ? " ·" : ""}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 6 }}>
              <button
                className="btn plain"
                onClick={async () => {
                  const url = routineLink(r);
                  haptic("tap");
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: r.name, text: `Flow-Sequenz „${r.name}"`, url });
                      return;
                    }
                    await navigator.clipboard.writeText(url);
                    toast(t.flow.linkCopied);
                  } catch (err) {
                    if (err instanceof DOMException && err.name === "AbortError") return;
                    toast(t.today.shareFailed);
                  }
                }}
              >
                {t.flow.share}
              </button>
              <button className="btn plain" onClick={() => { setEditing(r); setSheetOpen(true); haptic("tap"); }}>
                {t.flow.edit}
              </button>
            </div>
          </div>
        );
      })}

      {sessions.length ? (
        <>
          <p className="section-title">{t.flow.recent}</p>
          <div className="group">
            {sessions.map((s) => {
              const mins = Object.values(s.minutes).reduce((a, m) => a + (m ?? 0), 0);
              const when = new Date(s.startedAt);
              return (
                <div key={s.id} className="row">
                  <span className="row-title">
                    {s.routineName}
                    <span className="row-sub">
                      {when.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
                      {when.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · {s.completed}/{s.total} Blöcke
                    </span>
                  </span>
                  <span className="row-value mono">{mins} Min</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {sheetOpen ? (
        <RoutineSheet key={editing?.id ?? "new"} routine={editing} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      ) : null}
    </>
  );
}
