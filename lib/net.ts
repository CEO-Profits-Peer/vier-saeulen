"use client";

import { create } from "zustand";

export type SyncState = "idle" | "syncing" | "ok" | "error";

interface NetState {
  /** navigator.onLine sagt nur, ob ein Netz anliegt — nicht, ob es trägt.
   *  Für die Anzeige reicht das; ob der Sync wirklich durchkommt, verrät sync. */
  online: boolean;
  sync: SyncState;
  /** Letzter Fehler im Klartext, für die Konto-Seite */
  lastError: string | null;
  /** Änderungen, die auf einen erfolgreichen Push warten */
  pending: boolean;
  setOnline: (online: boolean) => void;
  setSync: (sync: SyncState, error?: string | null) => void;
  setPending: (pending: boolean) => void;
}

export const useNet = create<NetState>((set) => ({
  online: true,
  sync: "idle",
  lastError: null,
  pending: false,
  setOnline: (online) => set({ online }),
  setSync: (sync, error) =>
    set((s) => ({
      sync,
      lastError: sync === "error" ? (error ?? s.lastError ?? "Unbekannter Fehler") : null,
      pending: sync === "ok" ? false : s.pending,
    })),
  setPending: (pending) => set({ pending }),
}));

/** Zieht den Text aus allem, was als Fehler ankommt.
 *
 *  Supabase wirft einfache Objekte, keine Error-Instanzen — ein blosses
 *  String(err) ergibt darauf "[object Object]" und verschluckt damit jede
 *  Meldung. Deshalb hier ausdruecklich nach message und code greifen. */
function rawMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const o = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [o.message, o.details, o.hint].filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length) return o.code ? parts[0] + " (" + String(o.code) + ")" : parts[0];
    if (o.code) return "Fehler " + String(o.code);
  }
  return String(err);
}

/** Fehler aus Supabase und dem Netz-Stack lesbar machen. */
export function netMessage(err: unknown): string {
  const raw = rawMessage(err);
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror")) return "Keine Verbindung.";
  if (m.includes("relation") && m.includes("does not exist")) {
    return "Die Tabelle app_state fehlt — das SQL aus supabase/schema.sql wurde noch nicht ausgeführt.";
  }
  if (m.includes("jwt") || m.includes("token")) return "Sitzung abgelaufen — bitte neu anmelden.";
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Die Datenbank verweigert den Zugriff — prüfe die RLS-Policies.";
  }
  if (m.includes("does not exist") && m.includes("profiles.")) {
    return "Der Datenbank fehlen Spalten — supabase/friends.sql erneut ausführen.";
  }
  return raw || "Unbekannter Fehler";
}
