"use client";

import { create } from "zustand";

/** Chrome feuert dieses Ereignis, wenn die App installierbar ist. Es ist nicht
 *  in den Standard-Typen, deshalb hier das Nötige selbst beschrieben. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  /** Liegt vor, sobald Chrome die App als installierbar meldet */
  prompt: InstallPromptEvent | null;
  /** Läuft die App bereits als installierte PWA? */
  standalone: boolean;
  /** In dieser Sitzung installiert — der Prompt kommt danach nicht wieder */
  justInstalled: boolean;
  setPrompt: (e: InstallPromptEvent | null) => void;
  setStandalone: (v: boolean) => void;
  setJustInstalled: (v: boolean) => void;
}

export const useInstall = create<InstallState>((set) => ({
  prompt: null,
  standalone: false,
  justInstalled: false,
  setPrompt: (prompt) => set({ prompt }),
  setStandalone: (standalone) => set({ standalone }),
  setJustInstalled: (justInstalled) => set({ justInstalled, prompt: null }),
}));

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    /* iOS meldet den Homescreen-Start nur über diese nicht standardisierte Eigenschaft */
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS bietet kein beforeinstallprompt — dort bleibt nur die Anleitung. */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
