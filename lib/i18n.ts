"use client";

import { DICTS, detectLang, type Dict, type Lang } from "./dict";
import { useStore } from "./store";

export { detectLang, dictFor } from "./dict";
export type { Lang } from "./dict";

/** Die aktuelle Sprache.
 *
 *  Bewusst nur aus dem Profil, mit festem Rückfall auf Deutsch: Server und
 *  Browser müssen beim ersten Rendern dasselbe ergeben, sonst weicht die
 *  Hydration ab. Was der Browser bevorzugt, schreibt Providers einmalig ins
 *  Profil — danach ist es eine gespeicherte Entscheidung wie jede andere. */
export function useLang(): Lang {
  return useStore((s) => s.data.profile?.lang) ?? "de";
}

/** Die Texte der aktuellen Sprache. */
export function useT(): Dict {
  return DICTS[useLang()];
}

/** Für Stellen ausserhalb von React — Fehlermeldungen in lib/, Canvas-Texte. */
export function t(): Dict {
  const lang = useStore.getState().data.profile?.lang ?? "de";
  return DICTS[lang];
}
