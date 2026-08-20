"use client";

import { supabase } from "./supabase";
import type { AvatarKind, Pillar, Sigil } from "./types";

export interface FriendProfile {
  id: string;
  handle: string;
  display_name: string;
  emoji: string;
  accent: Pillar;
  /** Aeltere Zeilen kennen die beiden Felder nicht — deshalb optional. */
  avatar?: AvatarKind;
  sigil?: Sigil | null;
}

export interface FriendRow extends FriendProfile {
  /** Tagesscore von heute, falls die Person ihn geteilt hat */
  score: number | null;
  streak: number | null;
}

export interface PendingRow {
  id: string;
  profile: FriendProfile;
  /** true = wir haben gefragt, false = wir wurden gefragt */
  outgoing: boolean;
}

const need = () => {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  return supabase;
};

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Schlägt einen freien Handle aus Name oder E-Mail vor. */
export function suggestHandle(seed: string): string {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return base.length >= 3 ? base : `user_${Math.random().toString(36).slice(2, 7)}`;
}

export async function getMyProfile(userId: string): Promise<FriendProfile | null> {
  const { data, error } = await need()
    .from("profiles")
    .select("id, handle, display_name, emoji, accent, avatar, sigil")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as FriendProfile) ?? null;
}

/** Legt das öffentliche Profil an oder aktualisiert es. Der Handle ist
 *  eindeutig — die Datenbank lehnt Doppelungen ab, das fangen wir lesbar auf. */
export async function saveMyProfile(
  userId: string,
  patch: { handle?: string; display_name?: string; emoji?: string; accent?: Pillar; avatar?: AvatarKind; sigil?: Sigil | null },
): Promise<void> {
  const row = { id: userId, ...patch, updated_at: new Date().toISOString() };
  const { error } = await need().from("profiles").upsert(row, { onConflict: "id" });
  if (error) {
    if (error.code === "23505") throw new Error("Der Handle ist schon vergeben.");
    if (error.code === "23514") throw new Error("Handle: 3–20 Zeichen, nur a–z, 0–9 und _.");
    if (error.code === "42703") {
      throw new Error("Der Datenbank fehlen die Spalten avatar und sigil — supabase/friends.sql erneut ausführen.");
    }
    throw error;
  }
}

export async function findByHandle(handle: string): Promise<FriendProfile | null> {
  const { data, error } = await need().rpc("find_by_handle", { wanted: handle });
  if (error) throw error;
  const rows = (data ?? []) as FriendProfile[];
  return rows[0] ?? null;
}

export async function requestFriend(userId: string, otherId: string): Promise<void> {
  const { error } = await need()
    .from("friendships")
    .insert({ requester: userId, addressee: otherId, status: "pending" });
  if (error) {
    if (error.code === "23505") throw new Error("Ihr seid schon verbunden oder eine Anfrage läuft.");
    throw error;
  }
}

export async function acceptFriend(friendshipId: string): Promise<void> {
  const { error } = await need()
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId);
  if (error) throw error;
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await need().from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

interface RawFriendship {
  id: string;
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
}

/** Holt Freunde und offene Anfragen in wenigen Abfragen.
 *
 *  Die Profile kommen getrennt, weil eine Verknüpfung über zwei mögliche
 *  Spalten (requester oder addressee) in PostgREST unübersichtlich würde.
 */
export async function loadFriends(
  userId: string,
  today: string,
): Promise<{ friends: FriendRow[]; pending: PendingRow[] }> {
  const db = need();

  const { data: links, error: linkErr } = await db
    .from("friendships")
    .select("id, requester, addressee, status");
  if (linkErr) throw linkErr;

  const rows = (links ?? []) as RawFriendship[];
  const otherOf = (f: RawFriendship) => (f.requester === userId ? f.addressee : f.requester);
  const ids = rows.map(otherOf);

  if (!ids.length) return { friends: [], pending: [] };

  const { data: profiles, error: profErr } = await db
    .from("profiles")
    .select("id, handle, display_name, emoji, accent, avatar, sigil")
    .in("id", ids);
  if (profErr) throw profErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p as FriendProfile]));

  const acceptedIds = rows.filter((f) => f.status === "accepted").map(otherOf);
  let scores = new Map<string, { score: number; streak: number }>();
  if (acceptedIds.length) {
    const { data: shares, error: shareErr } = await db
      .from("daily_shares")
      .select("user_id, score, streak")
      .eq("day", today)
      .in("user_id", acceptedIds);
    if (shareErr) throw shareErr;
    scores = new Map((shares ?? []).map((s) => [s.user_id as string, { score: s.score as number, streak: s.streak as number }]));
  }

  const friends: FriendRow[] = [];
  const pending: PendingRow[] = [];

  for (const f of rows) {
    const profile = byId.get(otherOf(f));
    /* Ohne sichtbares Profil lässt sich nichts anzeigen — das passiert, wenn
       jemand sein Profil gelöscht hat. */
    if (!profile) continue;
    if (f.status === "accepted") {
      const s = scores.get(profile.id);
      friends.push({ ...profile, score: s?.score ?? null, streak: s?.streak ?? null });
    } else {
      pending.push({ id: f.id, profile, outgoing: f.requester === userId });
    }
  }

  friends.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return { friends, pending };
}

/** Teilt den heutigen Score. Mehr verlässt das Gerät nicht — keine Routinen,
 *  keine Notizen, keine Check-ins. */
export async function publishToday(userId: string, day: string, score: number, streak: number): Promise<void> {
  const { error } = await need()
    .from("daily_shares")
    .upsert(
      { user_id: userId, day, score, streak, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" },
    );
  if (error) throw error;
}

/** Nimmt alles zurück, was geteilt wurde. */
export async function unpublishAll(userId: string): Promise<void> {
  const { error } = await need().from("daily_shares").delete().eq("user_id", userId);
  if (error) throw error;
}
