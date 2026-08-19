"use client";

import { useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { Heatmap } from "@/components/charts/Heatmap";
import { Trend } from "@/components/charts/Trend";
import { useStore } from "@/lib/store";
import { bestStreak, dayStats, flowMinutes, levelInfo, streak, totalXP } from "@/lib/score";
import { addDays, dkey, isoWeek, mondayOf } from "@/lib/date";
import { DAY_ABBR, PILLARS, PKEYS, SEG_KINDS, type SegKind } from "@/lib/types";

const nf = new Intl.NumberFormat("de-DE");

export default function StatsPage() {
  return (
    <Hydrated>
      <Stats />
    </Hydrated>
  );
}

function Stats() {
  const data = useStore((s) => s.data);
  const setWeek = useStore((s) => s.setWeek);

  const xp = useMemo(() => totalXP(data), [data]);
  const level = levelInfo(xp);
  const tracked = Object.keys(data.days).length;

  const last30 = useMemo(() => {
    const values: number[] = [];
    for (let i = 0; i < 30; i++) {
      const key = dkey(addDays(new Date(), -i));
      if (data.days[key]) values.push(dayStats(data, key).pct);
    }
    return values;
  }, [data]);
  const avg30 = last30.length ? Math.round(last30.reduce((a, b) => a + b, 0) / last30.length) : 0;
  const perfect = useMemo(() => Object.keys(data.days).filter((k) => dayStats(data, k).pct >= 100).length, [data]);

  const balance = useMemo(() => {
    const acc = Object.fromEntries(PKEYS.map((p) => [p, { done: 0, total: 0 }])) as Record<string, { done: number; total: number }>;
    for (let i = 0; i < 30; i++) {
      const key = dkey(addDays(new Date(), -i));
      if (!data.days[key]) continue;
      const s = dayStats(data, key);
      PKEYS.forEach((p) => {
        acc[p].done += s.by[p].done;
        acc[p].total += s.by[p].total;
      });
    }
    return PKEYS.map((p) => ({
      pillar: p,
      pct: acc[p].total ? Math.round((acc[p].done / acc[p].total) * 100) : 0,
      has: acc[p].total > 0,
    }));
  }, [data]);

  const flow7 = useMemo(() => flowMinutes(data, 7), [data]);

  const weekKey = isoWeek(new Date());
  const week = data.weeks[weekKey] ?? { wins: ["", "", ""], lesson: "", focus: "", updatedAt: 0 };
  const weekSummary = useMemo(() => {
    const monday = mondayOf(new Date());
    let sum = 0;
    let n = 0;
    let best: { pct: number; date: Date } | null = null;
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const key = dkey(date);
      if (!data.days[key]) continue;
      const s = dayStats(data, key);
      sum += s.pct;
      n++;
      if (!best || s.pct > best.pct) best = { pct: s.pct, date };
    }
    return { avg: n ? Math.round(sum / n) : 0, n, best };
  }, [data]);

  const withData = balance.filter((b) => b.has);
  const worst = withData.length ? withData.reduce((a, b) => (a.pct <= b.pct ? a : b)) : null;
  const strongest = withData.length ? withData.reduce((a, b) => (a.pct >= b.pct ? a : b)) : null;

  const pastWeeks = Object.keys(data.weeks)
    .filter((k) => k !== weekKey)
    .sort()
    .reverse()
    .slice(0, 8);

  return (
    <>
      <Nav title="Stats" subtitle="Was du im Alltag nicht merkst." />

      {tracked < 3 ? (
        <div className="card" style={{ background: "color-mix(in srgb, var(--money) 12%, var(--card))" }}>
          <p style={{ margin: 0, fontSize: 14.5 }}>
            Die Zahlen hier werden ab ein paar getrackten Tagen interessant. Nach zwei Wochen siehst du, welcher Wochentag dich
            regelmäßig kippt und welche Säule du still fallen lässt.
          </p>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Tile label="Streak" value={String(streak(data))} suffix="Tage" />
        <Tile label="Beste Streak" value={String(bestStreak(data))} suffix="Tage" />
        <Tile label="Ø Score 30 Tage" value={String(avg30)} suffix="%" />
        <Tile label="Perfekte Tage" value={String(perfect)} />
        <Tile label="Gesamt-XP" value={nf.format(xp)} />
        <Tile label="Level" value={String(level.lvl)} suffix={`${level.rem}/${level.need}`} />
      </div>

      <p className="section-title">Konsistenz · 12 Wochen</p>
      <div className="card">
        <Heatmap data={data} />
      </div>

      <p className="section-title">Tagesscore · 14 Tage</p>
      <div className="card">
        <Trend data={data} />
      </div>

      <p className="section-title">Säulen-Balance · Ø 30 Tage</p>
      <div className="card">
        {balance.map((b) => (
          <div key={b.pillar} className={PILLARS[b.pillar].cls} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                <span className="dot" />
                <b style={{ fontWeight: 600 }}>{PILLARS[b.pillar].label}</b>
                <span style={{ fontSize: 13, color: "var(--label-2)" }}>{PILLARS[b.pillar].de}</span>
              </span>
              <span className="mono" style={{ fontSize: 13, color: "var(--label-2)" }}>{b.has ? `${b.pct} %` : "–"}</span>
            </div>
            <div className="progress" style={{ marginTop: 7 }}>
              <i style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
        <p style={{ fontSize: 13.5, color: "var(--label-2)", margin: 0 }}>
          {worst && strongest && worst.pct !== strongest.pct ? (
            <>
              <b>{PILLARS[strongest.pillar].label}</b> läuft am besten ({strongest.pct} %), <b>{PILLARS[worst.pillar].label}</b> hängt
              hinterher ({worst.pct} %). Meistens ist das die Säule, an der ein Tag scheitert — nicht die, die schon gut läuft.
            </>
          ) : (
            "Ein paar Tage tracken, dann steht hier, welche Säule du fallen lässt."
          )}
        </p>
      </div>

      <p className="section-title">Flow · letzte 7 Tage</p>
      <div className="card">
        {flow7.total === 0 ? (
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--label-2)" }}>
            Noch keine Sequenz gelaufen. Der Flow-Tab zählt konzentrierte Minuten, nicht nur Häkchen.
          </p>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }} className="mono">
              {flow7.total}
              <span style={{ fontSize: 16, color: "var(--label-2)", marginLeft: 4 }}>Min</span>
            </div>
            <div style={{ display: "flex", gap: 3, height: 10, marginTop: 12, borderRadius: 999, overflow: "hidden", background: "var(--fill)" }}>
              {(Object.keys(SEG_KINDS) as SegKind[]).map((k) =>
                flow7.byKind[k] ? (
                  <span key={k} className={SEG_KINDS[k].cls} style={{ flex: flow7.byKind[k], background: "var(--p)" }} />
                ) : null,
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
              {(Object.keys(SEG_KINDS) as SegKind[]).map((k) =>
                flow7.byKind[k] ? (
                  <span key={k} className={SEG_KINDS[k].cls} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--label-2)" }}>
                    <span className="dot" /> {SEG_KINDS[k].label} {flow7.byKind[k]} Min
                  </span>
                ) : null,
              )}
            </div>
          </>
        )}
      </div>

      <p className="section-title">Wochenreview · KW {weekKey.split("-W")[1]}</p>
      <div className="card">
        <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "var(--label-2)" }}>
          {weekSummary.n
            ? <>Diese Woche: <b style={{ color: "var(--label)" }}>{weekSummary.n}</b> getrackte Tage · Ø <b style={{ color: "var(--label)" }}>{weekSummary.avg} %</b>
              {weekSummary.best ? <> · bester Tag {DAY_ABBR[weekSummary.best.date.getDay()]} mit {weekSummary.best.pct} %</> : null}</>
            : "Diese Woche noch nichts getrackt."}
        </p>
        <p className="field-label">Drei Wins</p>
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            className="field"
            style={{ background: "var(--card-2)" }}
            value={week.wins[i] ?? ""}
            placeholder={`${i + 1}.`}
            aria-label={`Win ${i + 1}`}
            onChange={(e) => {
              const wins = [week.wins[0] ?? "", week.wins[1] ?? "", week.wins[2] ?? ""];
              wins[i] = e.target.value;
              setWeek({ wins });
            }}
          />
        ))}
        <p className="field-label">Lesson</p>
        <input className="field" style={{ background: "var(--card-2)" }} value={week.lesson} placeholder="Was hat nicht funktioniert — und warum?" onChange={(e) => setWeek({ lesson: e.target.value })} />
        <p className="field-label">Fokus nächste Woche</p>
        <input className="field" style={{ background: "var(--card-2)", marginBottom: 0 }} value={week.focus} placeholder="Eine Sache." onChange={(e) => setWeek({ focus: e.target.value })} />
      </div>

      {pastWeeks.length ? (
        <>
          <p className="section-title">Frühere Wochen</p>
          <div className="group">
            {pastWeeks.map((k) => {
              const w = data.weeks[k];
              const wins = w.wins.filter(Boolean);
              if (!wins.length && !w.lesson && !w.focus) return null;
              return (
                <div key={k} className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--label-2)" }}>KW {k.split("-W")[1]} · {k.slice(0, 4)}</span>
                  {wins.length ? <span style={{ fontSize: 14 }}>🏆 {wins.join(" · ")}</span> : null}
                  {w.lesson ? <span style={{ fontSize: 14 }}>📎 {w.lesson}</span> : null}
                  {w.focus ? <span style={{ fontSize: 14 }}>🎯 {w.focus}</span> : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}

function Tile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="card" style={{ margin: 0, padding: "13px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--label-2)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 4 }} className="mono">
        {value}
        {suffix ? <span style={{ fontSize: 13, color: "var(--label-2)", marginLeft: 5, fontWeight: 500 }}>{suffix}</span> : null}
      </div>
    </div>
  );
}
