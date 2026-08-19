import { addDays, dkey, fromKey, todayKey } from "./date";
import { PKEYS, STREAK_MIN, type AppData, type Habit, type Pillar } from "./types";

export const liveHabits = (d: AppData) => d.habits.filter((h) => !h.deletedAt);
export const liveGoals = (d: AppData) => d.goals.filter((g) => !g.deletedAt);
export const liveRoutines = (d: AppData) => d.routines.filter((r) => !r.deletedAt);

export function habitsFor(d: AppData, key: string): Habit[] {
  const dow = fromKey(key).getDay();
  return liveHabits(d).filter((h) => h.days.includes(dow));
}

export interface DayStats {
  total: number;
  done: number;
  pct: number;
  count: number;
  by: Record<Pillar, { total: number; done: number }>;
}

export function dayStats(d: AppData, key: string): DayStats {
  const rec = d.days[key];
  const list = habitsFor(d, key);
  const by = {} as DayStats["by"];
  PKEYS.forEach((p) => (by[p] = { total: 0, done: 0 }));
  let total = 0;
  let done = 0;
  for (const h of list) {
    total += h.pts;
    by[h.pillar].total += h.pts;
    if (rec?.done?.[h.id]) {
      done += h.pts;
      by[h.pillar].done += h.pts;
    }
  }
  if (rec?.t && key !== todayKey()) total = Math.max(total, rec.t);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, count: list.length, by };
}

export const totalXP = (d: AppData) =>
  Object.keys(d.days).reduce((sum, k) => sum + dayStats(d, k).done, 0);

export function levelInfo(xp: number) {
  let lvl = 1;
  let need = 200;
  let rem = xp;
  while (rem >= need) {
    rem -= need;
    lvl++;
    need = Math.round((need * 1.25) / 10) * 10;
  }
  return { lvl, rem, need };
}

export function streak(d: AppData) {
  let n = 0;
  let day = new Date();
  if (dayStats(d, dkey(day)).pct < STREAK_MIN) day = addDays(day, -1);
  for (let i = 0; i < 500; i++) {
    const k = dkey(day);
    if (!d.days[k] || dayStats(d, k).pct < STREAK_MIN) break;
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(d: AppData) {
  const keys = Object.keys(d.days)
    .filter((k) => dayStats(d, k).pct >= STREAK_MIN)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    run = prev && dkey(addDays(fromKey(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function goalPace(g: { target: number; current: number; due: string; created: string }) {
  const today = new Date();
  const due = fromKey(g.due);
  const created = fromKey(g.created);
  const msDay = 86400000;
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / msDay);
  const span = Math.max(1, Math.round((due.getTime() - created.getTime()) / msDay));
  const elapsed = Math.min(span, Math.max(0, Math.round((today.getTime() - created.getTime()) / msDay)));
  const pct = g.target ? Math.min(100, Math.max(0, (g.current / g.target) * 100)) : 0;
  const expected = (elapsed / span) * 100;
  const remaining = Math.max(0, g.target - g.current);
  const perWeek = daysLeft > 0 ? remaining / (daysLeft / 7) : remaining;
  const diff = pct - expected;
  const status: "done" | "over" | "ok" | "warn" | "crit" =
    pct >= 100 ? "done" : daysLeft < 0 ? "over" : diff >= -3 ? "ok" : diff >= -12 ? "warn" : "crit";
  return { pct, expected, daysLeft, perWeek, remaining, status };
}

/** Flow-Minuten der letzten n Tage, je Säule */
export function flowMinutes(d: AppData, days: number) {
  const out: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < days; i++) {
    const k = dkey(addDays(new Date(), -i));
    const f = d.days[k]?.flow;
    if (!f) continue;
    for (const [kind, mins] of Object.entries(f)) {
      out[kind] = (out[kind] ?? 0) + (mins ?? 0);
      total += mins ?? 0;
    }
  }
  return { byKind: out, total };
}
