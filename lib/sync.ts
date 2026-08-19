"use client";

import { supabase } from "./supabase";
import type { AppData, DayRec, Profile, WeekRec } from "./types";

const TABLE = "app_state";

type Keyed = { id: string; updatedAt: number };

function mergeById<T extends Keyed>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of a) map.set(item.id, item);
  for (const item of b) {
    const cur = map.get(item.id);
    if (!cur || (item.updatedAt ?? 0) > (cur.updatedAt ?? 0)) map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeRecords<T extends { updatedAt: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [key, val] of Object.entries(b)) {
    const cur = out[key];
    if (!cur || (val.updatedAt ?? 0) > (cur.updatedAt ?? 0)) out[key] = val;
  }
  return out;
}

/** Letzter Schreibvorgang je Eintrag gewinnt — nicht der letzte Gerätestand. */
export function mergeData(local: AppData, remote: AppData): AppData {
  return {
    v: 2,
    habits: mergeById(local.habits, remote.habits),
    goals: mergeById(local.goals, remote.goals),
    routines: mergeById(local.routines, remote.routines),
    days: mergeRecords<DayRec>(local.days, remote.days),
    weeks: mergeRecords<WeekRec>(local.weeks, remote.weeks),
    sessions: mergeById(
      local.sessions.map((s) => ({ ...s, updatedAt: s.endedAt })),
      remote.sessions.map((s) => ({ ...s, updatedAt: s.endedAt })),
    )
      .sort((x, y) => x.startedAt - y.startedAt)
      .slice(-400)
      .map(({ updatedAt: _drop, ...s }) => s),
    profile: newerProfile(local.profile, remote.profile),
    /* Joker sind reine Tagesschluessel ohne Zeitstempel — die Vereinigung ist
       hier richtig: ein auf einem Geraet gesetzter Schutz soll nicht
       verschwinden, nur weil das andere Geraet ihn nicht kennt. */
    jokers: [...new Set([...(local.jokers ?? []), ...(remote.jokers ?? [])])].sort(),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

/** Das Profil ist ein einzelner Datensatz — hier gewinnt schlicht der juengere. */
function newerProfile(a?: Profile, b?: Profile): Profile | undefined {
  if (!a) return b;
  if (!b) return a;
  return (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a;
}

export async function pullRemote(userId: string): Promise<AppData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data?.data as AppData) ?? null;
}

export async function pushRemote(userId: string, data: AppData): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

/** Loescht die eigene Zeile in der Cloud. Row Level Security erlaubt genau das
 *  und nichts daneben — das Auth-Konto selbst bleibt bestehen, dafuer braeuchte
 *  es Rechte, die eine oeffentliche App nicht haben darf. */
export async function deleteRemote(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId);
  if (error) throw error;
}
