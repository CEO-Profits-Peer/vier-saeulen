"use client";

import { useState } from "react";
import { addDays, dkey, fmtShort } from "@/lib/date";
import { dayStats } from "@/lib/score";
import { DAY_ABBR, STREAK_MIN, type AppData } from "@/lib/types";

const N = 14;
const W = 340;
const H = 130;
const padL = 24;
const padR = 8;
const padT = 12;
const padB = 22;

export function Trend({ data }: { data: AppData }) {
  const [picked, setPicked] = useState<number | null>(null);

  const points = Array.from({ length: N }, (_, i) => {
    const date = addDays(new Date(), -(N - 1 - i));
    const key = dkey(date);
    const tracked = Boolean(data.days[key]);
    return { key, date, tracked, pct: tracked ? dayStats(data, key).pct : 0 };
  });

  const x = (i: number) => padL + (i * (W - padL - padR)) / (N - 1);
  const y = (v: number) => padT + ((100 - v) / 100) * (H - padT - padB);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  const area = `${line} L${x(N - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const last = points[N - 1];
  const active = picked === null ? null : points[picked];

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round((rel - padL) / ((W - padL - padR) / (N - 1)));
    setPicked(Math.max(0, Math.min(N - 1, i)));
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="Tagesscore der letzten 14 Tage"
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        style={{ touchAction: "pan-y" }}
      >
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--separator)" strokeWidth={0.5} />
            <text x={0} y={y(v) + 3} fontSize={9} fill="var(--label-3)" className="mono">{v}</text>
          </g>
        ))}
        <line x1={padL} y1={y(STREAK_MIN)} x2={W - padR} y2={y(STREAK_MIN)} stroke="var(--label-3)" strokeWidth={1} strokeDasharray="3 3" />
        <path d={area} fill="var(--chart-fill)" />
        <path d={line} fill="none" stroke="var(--tint)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(N - 1)} cy={y(last.pct)} r={4} fill="var(--tint)" stroke="var(--card)" strokeWidth={2} />
        {active ? (
          <>
            <line x1={x(picked!)} y1={padT} x2={x(picked!)} y2={H - padB} stroke="var(--label-3)" strokeWidth={1} />
            <circle cx={x(picked!)} cy={y(active.pct)} r={5} fill="var(--tint)" stroke="var(--card)" strokeWidth={2} />
          </>
        ) : null}
        {points.map((p, i) =>
          i % 3 === 0 ? (
            <text key={p.key} x={x(i)} y={H - 6} fontSize={8.5} textAnchor="middle" fill="var(--label-3)" className="mono">
              {fmtShort(p.date)}
            </text>
          ) : null,
        )}
      </svg>
      <p style={{ fontSize: 13.5, color: "var(--label-2)", margin: "6px 0 0" }}>
        {active
          ? `${DAY_ABBR[active.date.getDay()]} ${fmtShort(active.date)} · ${active.tracked ? `${active.pct} %` : "nicht getrackt"}`
          : "Gestrichelt: die 60-%-Linie, ab der die Streak zählt."}
      </p>
    </div>
  );
}
