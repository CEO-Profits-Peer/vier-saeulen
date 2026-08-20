"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n";
import { insights, insightsNeeded } from "@/lib/insights";
import { useStore } from "@/lib/store";

export function Insights() {
  const t = useT();
  const data = useStore((s) => s.data);
  const found = useMemo(() => insights(data), [data]);
  const needed = useMemo(() => insightsNeeded(data), [data]);

  if (!found.length) {
    return (
      <div className="empty">
        {needed > 0
          ? t.insights.needMore(needed)
          : t.insights.none}
      </div>
    );
  }

  return (
    <div className="group">
      {found.map((i) => (
        <div key={i.id} className="row">
          <span className={`dot ${i.tone === "good" ? "dot-good" : "dot-bad"}`} />
          <span className="row-title">
            {i.text}
            <span className="row-sub">{t.insights.fromDays(i.sample)}</span>
          </span>
        </div>
      ))}
      <div className="row">
        <span className="row-title" style={{ fontSize: 13, color: "var(--label-2)" }}>
          {t.insights.disclaimer}
        </span>
      </div>
    </div>
  );
}
