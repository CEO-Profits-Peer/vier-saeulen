"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { Ring } from "./Ring";
import { Sheet } from "./Sheet";
import { haptic } from "@/lib/haptics";
import { jokersLeft } from "@/lib/score";
import { dayStats, habitsFor } from "@/lib/score";
import { shareDayCard } from "@/lib/share";
import { useStore } from "@/lib/store";
import { toast } from "./Toast";
import { fmtLong, fromKey, todayKey } from "@/lib/date";
import { PILLARS, PKEYS, STREAK_MIN } from "@/lib/types";

/** Rückblick: ein Datum wählen und den Tag ansehen. Die Daten liegen längst
 *  im Store — es fehlte nur der Weg dorthin. */
export function DayLookup() {
  const t = useT();
  const data = useStore((s) => s.data);
  const toggleJoker = useStore((s) => s.toggleJoker);
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);

  const today = todayKey();
  const first = useMemo(() => {
    const keys = Object.keys(data.days).sort();
    return keys[0] ?? today;
  }, [data.days, today]);

  const stats = key ? dayStats(data, key) : null;
  const rec = key ? data.days[key] : undefined;
  const list = key ? habitsFor(data, key) : [];
  const isJoker = key ? (data.jokers ?? []).includes(key) : false;
  const left = jokersLeft(data, key ? fromKey(key) : new Date());
  const missed = Boolean(stats && stats.total > 0 && stats.pct < STREAK_MIN);

  return (
    <>
      <div className="card">
        <p className="field-label">{t.lookback.pick}</p>
        <input
          className="field"
          type="date"
          min={first}
          max={today}
          value={key}
          style={{ marginBottom: 0 }}
          onChange={(e) => {
            setKey(e.target.value);
            if (e.target.value) {
              setOpen(true);
              haptic("tap");
            }
          }}
        />
      </div>

      <Sheet open={open && Boolean(key)} onClose={() => setOpen(false)} title={key ? fmtLong(fromKey(key)) : ""}>
        {stats ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
              <Ring pct={stats.pct} color="var(--tint)" size={78} stroke={8}>
                <span style={{ fontWeight: 700, fontSize: 20 }} className="mono">{stats.pct}</span>
              </Ring>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{stats.done} von {stats.total} Punkten</div>
                <div style={{ fontSize: 13, color: "var(--label-2)" }}>
                  {stats.count} {stats.count === 1 ? "Routine" : "Routinen"} an dem Tag
                  {isJoker ? " · per Joker geschützt" : ""}
                </div>
              </div>
            </div>

            {PKEYS.map((p) => {
              const b = stats.by[p];
              const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
              return (
                <div key={p} className={PILLARS[p].cls} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{PILLARS[p].label}</span>
                    <span className="mono" style={{ color: "var(--label-2)" }}>{b.total ? `${pct} %` : "—"}</span>
                  </div>
                  <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}

            {rec?.checkin?.win ? (
              <div className="card" style={{ marginTop: 14 }}>
                <p className="field-label" style={{ margin: "0 0 4px" }}>{t.lookback.win}</p>
                <p style={{ margin: 0 }}>{rec.checkin.win}</p>
              </div>
            ) : null}
            {rec?.checkin?.note ? (
              <div className="card">
                <p className="field-label" style={{ margin: "0 0 4px" }}>{t.lookback.note}</p>
                <p style={{ margin: 0 }}>{rec.checkin.note}</p>
              </div>
            ) : null}

            {/* Joker nur anbieten, wo er etwas bewirkt: an einem verpassten Tag */}
            {key !== today && (missed || isJoker) ? (
              <button
                className={`btn wide${isJoker ? "" : " filled"}`}
                style={{ marginTop: 8 }}
                disabled={!isJoker && left < 1}
                onClick={() => {
                  toggleJoker(key);
                  haptic(isJoker ? "tap" : "success");
                  toast(isJoker ? t.lookback.jokerUndone : t.lookback.jokerSet);
                }}
              >
                {isJoker
                  ? t.lookback.undoJoker
                  : left < 1
                    ? t.lookback.jokerUsedUp
                    : t.lookback.useJoker(left)}
              </button>
            ) : null}

            <button
              className="btn wide"
              style={{ marginTop: 8 }}
              onClick={async () => {
                const res = await shareDayCard(data, key);
                if (res === "downloaded") toast(t.today.savedAsImage);
                else if (res === "failed") toast(t.today.shareFailed);
              }}
            >
              {t.lookback.shareImage}
            </button>
          </>
        ) : null}
      </Sheet>
    </>
  );
}
