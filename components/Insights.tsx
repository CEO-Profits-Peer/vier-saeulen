"use client";

import { useMemo } from "react";
import { insights, insightsNeeded } from "@/lib/insights";
import { useStore } from "@/lib/store";

export function Insights() {
  const data = useStore((s) => s.data);
  const found = useMemo(() => insights(data), [data]);
  const needed = useMemo(() => insightsNeeded(data), [data]);

  if (!found.length) {
    return (
      <div className="empty">
        {needed > 0
          ? `Noch ${needed} ${needed === 1 ? "Check-in" : "Check-ins"}, dann tauchen hier Muster auf.`
          : "Noch keine deutlichen Muster — bisher liegen deine Tage zu eng beieinander."}
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
            <span className="row-sub">aus {i.sample} Tagen</span>
          </span>
        </div>
      ))}
      <div className="row">
        <span className="row-title" style={{ fontSize: 13, color: "var(--label-2)" }}>
          Das sind Zusammenhänge, keine Ursachen — beobachtet auf deinen eigenen Tagen.
        </span>
      </div>
    </div>
  );
}
