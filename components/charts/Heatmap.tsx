"use client";

import { useState } from "react";
import { addDays, dkey, fmtShort, mondayOf, todayKey } from "@/lib/date";
import { dayStats } from "@/lib/score";
import { DAY_ABBR, type AppData } from "@/lib/types";

const WEEKS = 12;
const STEP = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];
const stepOf = (pct: number, tracked: boolean) => (!tracked ? 0 : pct >= 85 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : pct > 0 ? 1 : 0);

export function Heatmap({ data }: { data: AppData }) {
  const [picked, setPicked] = useState<string | null>(null);
  const today = new Date();
  const start = addDays(mondayOf(today), -(WEEKS - 1) * 7);

  const cells: { key: string; date: Date; future: boolean }[] = [];
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const date = addDays(start, col * 7 + row);
      cells.push({ key: dkey(date), date, future: date > today });
    }
  }

  const detail = picked ? { key: picked, stats: dayStats(data, picked), tracked: Boolean(data.days[picked]) } : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 4, paddingTop: 1 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <span key={d} className="mono" style={{ fontSize: 9, color: "var(--label-3)", lineHeight: "16px" }}>
              {DAY_ABBR[d]}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${WEEKS}, 1fr)`, gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)", gap: 4, flex: 1 }}>
          {cells.map(({ key, future }) => {
            const tracked = Boolean(data.days[key]);
            const pct = tracked ? dayStats(data, key).pct : 0;
            const isToday = key === todayKey();
            return (
              <button
                key={key}
                onClick={() => setPicked(future ? null : key)}
                aria-label={`${key}: ${tracked ? `${pct} Prozent` : "nicht getrackt"}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 4,
                  background: future ? "transparent" : STEP[stepOf(pct, tracked)],
                  border: isToday ? "1.5px solid var(--label)" : future ? "1px dashed var(--separator)" : picked === key ? "1.5px solid var(--tint)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 11, color: "var(--label-2)" }} className="mono">
        <span>0 %</span>
        {STEP.map((s) => (
          <span key={s} style={{ width: 12, height: 12, borderRadius: 3, background: s, border: "0.5px solid var(--separator)" }} />
        ))}
        <span>100 %</span>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--label-2)", margin: "10px 0 0", minHeight: 20 }}>
        {detail
          ? `${DAY_ABBR[new Date(detail.key).getDay()]} ${fmtShort(new Date(detail.key))} · ${
              detail.tracked ? `${detail.stats.pct} % · ${detail.stats.done} von ${detail.stats.total} Punkten` : "nicht getrackt"
            }`
          : "Tippe auf einen Tag für die Details."}
      </p>
    </div>
  );
}
