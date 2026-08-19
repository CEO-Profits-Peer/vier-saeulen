"use client";

import { useEffect, useState } from "react";
import { todayKey } from "./date";

/** Gibt den heutigen Datumsschlüssel zurück und wechselt ihn über Mitternacht hinweg von selbst. */
export function useToday() {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    const check = () => setKey((cur) => (todayKey() === cur ? cur : todayKey()));
    const id = setInterval(check, 30000);
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  return key;
}
