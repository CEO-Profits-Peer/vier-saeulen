import { dayStats } from "./score";
import { fromKey } from "./date";
import { DAY_ABBR, type AppData } from "./types";

export interface Insight {
  id: string;
  text: string;
  /** Unterschied im Tagesscore, in Prozentpunkten */
  delta: number;
  /** Auf wie vielen Tagen der Befund beruht */
  sample: number;
  tone: "good" | "bad";
}

/* Unter diesen Schwellen ist ein Befund Rauschen und wird nicht gezeigt. */
const MIN_DAYS = 10;
const MIN_DELTA = 5;
const MIN_PER_WEEKDAY = 3;
const MIN_DAYS_WEEKDAY = 21;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface Pair {
  value: number;
  score: number;
}

/** Teilt die Tage am Median und vergleicht die Mittelwerte beider Hälften.
 *
 *  Bewusst kein Korrelationskoeffizient: der Median-Split ist robust gegen
 *  Ausreißer und lässt sich in einem Satz erklären. Das Ergebnis beschreibt
 *  einen Zusammenhang, keine Ursache — die Formulierungen sagen deshalb
 *  „liegt höher“ und nie „führt zu“.
 */
function split(pairs: Pair[]): { delta: number; cut: number; high: number; low: number } | null {
  if (pairs.length < MIN_DAYS) return null;
  const cut = median(pairs.map((p) => p.value));
  const high = pairs.filter((p) => p.value > cut).map((p) => p.score);
  const low = pairs.filter((p) => p.value <= cut).map((p) => p.score);
  /* Liegen zu viele Tage exakt auf dem Median, trägt der Vergleich nicht. */
  if (high.length < 3 || low.length < 3) return null;
  return { delta: Math.round(mean(high) - mean(low)), cut, high: high.length, low: low.length };
}

function collect(d: AppData, pick: (key: string) => number | null | undefined): Pair[] {
  const out: Pair[] = [];
  for (const key of Object.keys(d.days)) {
    const value = pick(key);
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const s = dayStats(d, key);
    if (!s.total) continue;
    out.push({ value, score: s.pct });
  }
  return out;
}

const fmtHours = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(".", ","));

export function insights(d: AppData): Insight[] {
  const found: Insight[] = [];

  const metrics: {
    id: string;
    pick: (key: string) => number | null | undefined;
    phrase: (cut: number, delta: number) => string;
  }[] = [
    {
      id: "sleep",
      pick: (k) => d.days[k]?.checkin?.sleep,
      phrase: (cut, delta) =>
        delta > 0
          ? `Mit mehr als ${fmtHours(cut)} h Schlaf liegt dein Tagesscore ${delta} Punkte höher.`
          : `An Tagen mit mehr als ${fmtHours(cut)} h Schlaf liegt dein Score ${Math.abs(delta)} Punkte niedriger — ungewöhnlich, schau mal genauer hin.`,
    },
    {
      id: "screen",
      pick: (k) => d.days[k]?.checkin?.screen,
      phrase: (cut, delta) =>
        delta < 0
          ? `Über ${fmtHours(cut)} h Bildschirmzeit kosten dich im Schnitt ${Math.abs(delta)} Punkte.`
          : `Mehr als ${fmtHours(cut)} h Bildschirmzeit gehen bei dir mit ${delta} Punkten mehr einher.`,
    },
    {
      id: "energy",
      pick: (k) => d.days[k]?.checkin?.energy,
      phrase: (_cut, delta) =>
        delta > 0
          ? `An Tagen mit hoher Energie holst du ${delta} Punkte mehr.`
          : `Hohe Energie fällt bei dir mit ${Math.abs(delta)} Punkten weniger zusammen.`,
    },
    {
      id: "focus",
      pick: (k) => d.days[k]?.checkin?.focus,
      phrase: (_cut, delta) =>
        delta > 0
          ? `An Tagen mit hohem Fokus liegt dein Score ${delta} Punkte höher.`
          : `Hoher Fokus fällt bei dir mit ${Math.abs(delta)} Punkten weniger zusammen.`,
    },
    {
      id: "flow",
      pick: (k) => {
        const f = d.days[k]?.flow;
        if (!f) return null;
        const total = Object.values(f).reduce((a: number, m) => a + (m ?? 0), 0);
        return total || null;
      },
      phrase: (cut, delta) =>
        delta > 0
          ? `Mit mehr als ${Math.round(cut)} Flow-Minuten liegt dein Score ${delta} Punkte höher.`
          : `Viel Flow-Zeit geht bei dir mit ${Math.abs(delta)} Punkten weniger einher.`,
    },
  ];

  for (const m of metrics) {
    const pairs = collect(d, m.pick);
    const res = split(pairs);
    if (!res || Math.abs(res.delta) < MIN_DELTA) continue;
    found.push({
      id: m.id,
      text: m.phrase(res.cut, res.delta),
      delta: res.delta,
      sample: pairs.length,
      /* Bei Bildschirmzeit ist ein Minus die gute Nachricht, sonst ein Plus. */
      tone: (m.id === "screen" ? -res.delta : res.delta) > 0 ? "good" : "bad",
    });
  }

  /* Wochentage: nur wenn genug Wochen zusammengekommen sind. */
  const days = Object.keys(d.days).filter((k) => dayStats(d, k).total > 0);
  if (days.length >= MIN_DAYS_WEEKDAY) {
    const buckets: number[][] = Array.from({ length: 7 }, () => []);
    for (const k of days) buckets[fromKey(k).getDay()].push(dayStats(d, k).pct);
    const usable = buckets
      .map((scores, dow) => ({ dow, scores, avg: mean(scores) }))
      .filter((b) => b.scores.length >= MIN_PER_WEEKDAY);
    if (usable.length >= 4) {
      const best = usable.reduce((a, b) => (a.avg >= b.avg ? a : b));
      const worst = usable.reduce((a, b) => (a.avg <= b.avg ? a : b));
      const delta = Math.round(best.avg - worst.avg);
      if (delta >= MIN_DELTA) {
        found.push({
          id: "weekday",
          text: `${DAY_ABBR[best.dow]} ist dein stärkster Tag, ${DAY_ABBR[worst.dow]} dein schwächster — ${delta} Punkte Unterschied.`,
          delta,
          sample: days.length,
          tone: "good",
        });
      }
    }
  }

  return found.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Wie viele Tage noch fehlen, bis überhaupt etwas ausgewertet werden kann. */
export function insightsNeeded(d: AppData): number {
  const withCheckin = Object.keys(d.days).filter((k) => {
    const ci = d.days[k]?.checkin;
    return ci && (ci.sleep != null || ci.energy != null || ci.focus != null || ci.screen != null);
  }).length;
  return Math.max(0, MIN_DAYS - withCheckin);
}
