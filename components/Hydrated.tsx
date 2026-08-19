"use client";

import { useStore } from "@/lib/store";

/** Bis der lokale Speicher gelesen ist, zeigen wir nichts — sonst blitzt der Server-Stand auf. */
export function Hydrated({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  if (!hydrated) return <div style={{ minHeight: "60dvh" }} aria-hidden />;
  return <>{children}</>;
}
