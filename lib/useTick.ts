"use client";

import { useEffect, useReducer } from "react";

/** Erzwingt ein Re-Render im festen Takt — der Timer rechnet trotzdem aus echten Zeitstempeln. */
export function useTick(ms: number, active = true) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(force, ms);
    return () => clearInterval(id);
  }, [ms, active]);
}
