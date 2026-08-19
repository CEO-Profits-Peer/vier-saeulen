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

/** Fehler aus Supabase und dem Netz-Stack lesbar machen. */
export function netMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror")) return "Keine Verbindung.";
  if (m.includes("relation") && m.includes("does not exist")) {
    return "Die Tabelle app_state fehlt — das SQL aus supabase/schema.sql wurde noch nicht ausgeführt.";
  }
  if (m.includes("jwt") || m.includes("token")) return "Sitzung abgelaufen — bitte neu anmelden.";
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Die Datenbank verweigert den Zugriff — prüfe die RLS-Policies.";
  }
  return raw || "Unbekannter Fehler";
}
