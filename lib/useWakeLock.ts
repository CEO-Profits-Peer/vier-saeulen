"use client";

import { useEffect } from "react";

/** Hält den Bildschirm an, solange eine Sequenz läuft. Ohne Unterstützung passiert einfach nichts. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* Akkusparmodus oder kein Support */
      }
    };
    void request();

    const onVisible = () => {
      if (!document.hidden && !cancelled) void request();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
