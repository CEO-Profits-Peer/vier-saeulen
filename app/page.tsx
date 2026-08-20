"use client";

import { Avatar } from "@/components/Avatar";
import { WeekPlan } from "@/components/WeekPlan";
import { useT } from "@/lib/i18n";
import { shareDayCard } from "@/lib/share";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Ring } from "@/components/Ring";
import { Hydrated } from "@/components/Hydrated";
import { Check, Chevron, Play, Plus, SkipDay, Undo } from "@/components/Icons";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { dayStats, habitsFor, levelInfo, liveRoutines, streak, totalXP } from "@/lib/score";
import { fmtLong, fromKey } from "@/lib/date";
import { BKEYS, BLOCKS, DAY_ABBR, PILLARS, PKEYS, STREAK_MIN, type Block, MAX_SKIPS_PER_DAY } from "@/lib/types";

export default function TodayPage() {
  return (
    <Hydrated>
      <Today />
    </Hydrated>
  );
}

function Today() {
  const t = useT();
  const key = useToday();
  const data = useStore((s) => s.data);
  const toggleHabitDone = useStore((s) => s.toggleHabitDone);
  const toggleHabitSkip = useStore((s) => s.toggleHabitSkip);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeTask = useStore((s) => s.removeTask);
  const setCheckin = useStore((s) => s.setCheckin);
  const [taskText, setTaskText] = useState("");

  const stats = useMemo(() => dayStats(data, key), [data, key]);
  const rec = data.days[key];
  const list = useMemo(() => habitsFor(data, key), [data, key]);
  const routines = liveRoutines(data);
  const xp = useMemo(() => totalXP(data), [data]);
  const level = levelInfo(xp);
  const days = streak(data);

  const hour = new Date().getHours();
  const nowBlock: Block = hour < 10 ? "morning" : hour < 14 ? "school" : hour < 19 ? "afternoon" : "evening";
  const order = [...BKEYS.slice(BKEYS.indexOf(nowBlock)), ...BKEYS.slice(0, BKEYS.indexOf(nowBlock))];
  const next = order.flatMap((b) => list.filter((h) => h.block === b && !rec?.done?.[h.id]))[0];

  const note =
    stats.total === 0
      ? "Heute steht nichts im System — leg unter System Routinen an."
      : stats.pct >= 100
        ? t.today.notes.perfect
        : stats.pct >= STREAK_MIN
          ? t.today.notes.above
          : stats.pct > 0
            ? t.today.notes.below(STREAK_MIN - stats.pct)
            : t.today.notes.nothing;

  const skipsUsed = Object.keys(rec?.skipped ?? {}).length;
  const skipsLeft = Math.max(0, MAX_SKIPS_PER_DAY - skipsUsed);

  const tasks = rec?.tasks ?? [];
  const checkin = rec?.checkin ?? {};

  return (
    <>
      <Nav
        title={t.today.title}
        subtitle={fmtLong(fromKey(key))}
        right={
          <>
            <button
              className="badge"
              aria-label={t.today.shareLabel}
              onClick={async () => {
                const res = await shareDayCard(data, key);
                if (res === "downloaded") toast(t.today.savedAsImage);
                else if (res === "failed") toast(t.today.shareFailed);
              }}
            >
              {`↗ ${t.today.share}`}
            </button>
            {/* Das eigene Profilbild statt eines Zahnrads: es ist grösser
                anzutippen, sagt dasselbe, und man sieht sein Zeichen jeden Tag. */}
            <Link
              href="/du"
              aria-label={t.tabs.you}
              style={{ display: "grid", placeItems: "center", borderRadius: "50%", flex: "none" }}
            >
              <Avatar profile={data.profile} fallback={t.app.name} size={34} />
            </Link>
          </>
        }
      />

      {/* Tagesscore */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div>
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }} className="mono">
              {stats.pct}
              <span style={{ fontSize: 22, color: "var(--label-2)" }}>%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--label-2)" }}>{note}</p>
            <div style={{ display: "flex", gap: 2, height: 8, marginTop: 12, background: "var(--fill)", borderRadius: 999, overflow: "hidden" }}>
              {PKEYS.map((p) => (
                <motion.i
                  key={p}
                  initial={false}
                  animate={{ width: `${stats.total ? (stats.by[p].done / stats.total) * 100 : 0}%` }}
                  transition={{ type: "spring", stiffness: 140, damping: 22 }}
                  style={{ background: `var(${PILLARS[p].varName})`, borderRadius: 999, display: "block" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "var(--label-2)" }} className="mono">
              <span>{t.today.pointsOf(stats.done, stats.total)}</span>
              <span>{days > 0 ? t.today.streakDays(days) : t.today.level(level.lvl)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 18 }}>
          {PKEYS.map((p) => {
            const b = stats.by[p];
            const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
            return (
              <div key={p} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Ring pct={pct} color={`var(${PILLARS[p].varName})`} size={58} stroke={6}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{b.total ? `${pct}%` : "–"}</span>
                </Ring>
                <span style={{ fontSize: 11, color: "var(--label-2)", fontWeight: 500 }}>{PILLARS[p].label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Als Nächstes */}
      {next ? (
        <motion.button
          layout
          className={`card ${PILLARS[next.pillar].cls}`}
          onClick={() => {
            toggleHabitDone(next.id);
            haptic("success");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            width: "100%",
            textAlign: "left",
            background: "color-mix(in srgb, var(--p) 12%, var(--card))",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--p)", letterSpacing: "0.02em" }}>
              {t.today.next.toUpperCase()} · {t.blocks[next.block].toUpperCase()}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{next.name}</div>
          </div>
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--p)", display: "grid", placeItems: "center", flex: "none" }}>
            <Check size={18} />
          </span>
        </motion.button>
      ) : stats.total > 0 ? (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>✓</span>
          <div>
            <div style={{ fontWeight: 600 }}>Alles abgehakt</div>
            <div style={{ fontSize: 13, color: "var(--label-2)" }}>Tag geschlossen. Der Rest ist Bonus.</div>
          </div>
        </div>
      ) : null}

      {/* Flow-Schnellstart */}
      {routines.length ? (
        <>
          <WeekPlan compact />

          <p className="section-title">Flow</p>
          <div className="group">
            {routines.slice(0, 2).map((r) => {
              const mins = r.segments.reduce((a, s) => a + s.minutes, 0);
              return (
                <Link key={r.id} href={`/flow?start=${r.id}`} className="row tappable" onClick={() => haptic("tap")}>
                  <span style={{ fontSize: 20 }}>{r.emoji}</span>
                  <span className="row-title">
                    {r.name}
                    <span className="row-sub">{r.segments.length} Blöcke · {mins} Min</span>
                  </span>
                  <span style={{ color: "var(--tint)" }}><Play size={18} /></span>
                </Link>
              );
            })}
            <Link href="/flow" className="row tappable">
              <span className="row-title" style={{ color: "var(--tint)" }}>Alle Sequenzen</span>
              <span className="chevron"><Chevron /></span>
            </Link>
          </div>
        </>
      ) : null}

      {/* Routinen nach Tageszeit */}
      {BKEYS.map((b) => {
        const hs = list.filter((h) => h.block === b);
        if (!hs.length) return null;
        const done = hs.filter((h) => rec?.done?.[h.id]).length;
        return (
          <div key={b}>
            <p className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t.blocks[b]}</span>
              <span className="mono" style={{ textTransform: "none" }}>
                {done}/{hs.filter((h) => !rec?.skipped?.[h.id]).length}
              </span>
            </p>
            <div className="group">
              {hs.map((h) => {
                const isDone = Boolean(rec?.done?.[h.id]);
                const isSkipped = Boolean(rec?.skipped?.[h.id]);
                const blocked = !isSkipped && skipsLeft < 1;
                return (
                  <div
                    key={h.id}
                    className={`row ${PILLARS[h.pillar].cls}${isDone ? " checked" : ""}${isSkipped ? " skipped" : ""}`}
                  >
                    <button
                      className="row-main"
                      onClick={() => {
                        toggleHabitDone(h.id);
                        haptic(isDone ? "tap" : "success");
                      }}
                    >
                      <span className="checkbox"><Check size={15} /></span>
                      <span className="row-title">{h.name}</span>
                      <span className="row-value mono">{h.pts}</span>
                    </button>
                    <button
                      className="row-skip"
                      aria-pressed={isSkipped}
                      disabled={blocked}
                      title={
                        isSkipped
                          ? t.today.skip.undoHint
                          : blocked
                            ? t.today.skip.blocked(MAX_SKIPS_PER_DAY)
                            : t.today.skip.hint
                      }
                      aria-label={isSkipped ? t.today.skip.undoLabel(h.name) : t.today.skip.label(h.name)}
                      onClick={() => {
                        if (blocked) {
                          haptic("warn");
                          toast(t.today.skip.tooMany(MAX_SKIPS_PER_DAY));
                          return;
                        }
                        toggleHabitSkip(h.id);
                        haptic("tap");
                        toast(isSkipped ? t.today.skip.undone : t.today.skip.done);
                      }}
                    >
                      {isSkipped ? <Undo /> : <SkipDay />}
                    </button>
                    <span className="dot" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {list.length === 0 ? (
        <div className="empty">
          {t.today.nothingPlanned(t.dayAbbr[fromKey(key).getDay()])}
          <br />
          <Link href="/du?t=routinen">{t.today.createRoutines}</Link>
        </div>
      ) : null}

      {/* Extra-Aufgaben */}
      <p className="section-title">{t.today.extra}</p>
      <div className="group">
        {tasks.map((task) => (
          <div key={task.id} className={`row${task.done ? " checked" : ""}`} style={{ ["--p" as string]: "var(--label-2)" }}>
            <button className="checkbox" onClick={() => { toggleTask(task.id); haptic("tap"); }} aria-label={task.done ? t.today.markOpen : t.today.markDone}>
              <Check size={15} />
            </button>
            <span className="row-title">{task.text}</span>
            <button className="btn plain" onClick={() => { removeTask(task.id); haptic("tap"); }} aria-label={t.today.deleteTask} style={{ color: "var(--label-3)" }}>
              ✕
            </button>
          </div>
        ))}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const text = taskText.trim();
            if (!text) return;
            addTask(text);
            setTaskText("");
            haptic("tap");
          }}
        >
          <span style={{ color: "var(--tint)" }}><Plus /></span>
          <input
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder={t.today.newTask}
            style={{ flex: 1, background: "none", border: 0, fontSize: 16, minWidth: 0 }}
            aria-label={t.today.newTaskLabel}
          />
          {taskText ? <button className="btn plain" type="submit">Add</button> : null}
        </form>
      </div>

      {/* Check-in */}
      <p className="section-title">{t.today.checkin}</p>
      <div className="card">
        <Scale label="Energie" value={checkin.energy ?? null} onChange={(v) => setCheckin({ energy: v })} />
        <Scale label="Fokus" value={checkin.focus ?? null} onChange={(v) => setCheckin({ focus: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <div>
            <p className="field-label">Schlaf (h)</p>
            <input
              className="field"
              style={{ background: "var(--card-2)" }}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={checkin.sleep ?? ""}
              onChange={(e) => setCheckin({ sleep: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="8"
            />
          </div>
          <div>
            <p className="field-label">Screen (h)</p>
            <input
              className="field"
              style={{ background: "var(--card-2)" }}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={checkin.screen ?? ""}
              onChange={(e) => setCheckin({ screen: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="3"
            />
          </div>
        </div>
        <p className="field-label" style={{ marginTop: 6 }}>Win des Tages</p>
        <input
          className="field"
          style={{ background: "var(--card-2)" }}
          value={checkin.win ?? ""}
          onChange={(e) => setCheckin({ win: e.target.value })}
          placeholder="Was lief heute gut?"
        />
        <p className="field-label">Notiz</p>
        <textarea
          className="field"
          style={{ background: "var(--card-2)", minHeight: 88, resize: "vertical" }}
          value={checkin.note ?? ""}
          onChange={(e) => setCheckin({ note: e.target.value })}
          placeholder="Gedanken, Learnings, was morgen besser läuft…"
        />
        <p style={{ fontSize: 13, color: "var(--label-2)", margin: 0 }}>Wird automatisch gespeichert.</p>
      </div>
    </>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="field-label">{label}</p>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className="chip mono"
            style={{ flex: 1, justifyContent: "center", minHeight: 44 }}
            aria-pressed={value === n}
            onClick={() => {
              onChange(value === n ? null : n);
              haptic("tap");
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
