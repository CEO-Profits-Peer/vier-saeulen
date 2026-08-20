import { dictFor, detectLang, type Lang } from "./dict";
import { ALLDAYS, WEEKDAYS, type AppData, type FlowRoutine, type Goal, type Habit } from "./types";
import { addDays, dkey, todayKey, uid } from "./date";

/* Die Startdaten sind Inhalte, keine Oberfläche: sie werden einmal in der
   gewählten Sprache angelegt und danach nie wieder übersetzt. Wer die App auf
   Englisch umstellt, behält seine deutschen Routinen — sie gehören ihm. */

export function seedHabits(lang: Lang = detectLang()): Habit[] {
  const n = dictFor(lang).seed.habits;
  const now = Date.now();
  const h = (name: string, pillar: Habit["pillar"], block: Habit["block"], pts: number, days: number[]): Habit => ({
    id: uid(), name, pillar, block, pts, days, updatedAt: now,
  });
  return [
    h(n[0], "body", "morning", 10, ALLDAYS),
    h(n[1], "body", "morning", 5, ALLDAYS),
    h(n[2], "learn", "morning", 5, ALLDAYS),
    h(n[3], "learn", "school", 10, WEEKDAYS),
    h(n[4], "image", "school", 10, WEEKDAYS),
    h(n[5], "image", "school", 5, WEEKDAYS),
    h(n[6], "learn", "afternoon", 15, WEEKDAYS),
    h(n[7], "body", "afternoon", 15, [1, 2, 4, 5, 6]),
    h(n[8], "learn", "afternoon", 10, ALLDAYS),
    h(n[9], "image", "afternoon", 10, [1, 3, 5, 0]),
    h(n[10], "money", "afternoon", 10, WEEKDAYS),
    h(n[11], "money", "evening", 5, ALLDAYS),
    h(n[12], "body", "evening", 10, ALLDAYS),
    h(n[13], "learn", "evening", 10, ALLDAYS),
  ];
}

export function seedGoals(lang: Lang = detectLang()): Goal[] {
  const n = dictFor(lang).seed.goals;
  const now = Date.now();
  const due = dkey(addDays(new Date(), 90));
  const g = (title: string, pillar: Goal["pillar"], target: number, unit: string): Goal => ({
    id: uid(), title, pillar, target, unit, current: 0, due, created: todayKey(), updatedAt: now,
  });
  return [
    g(n[0], "learn", 100, "h"),
    g(n[1], "body", 60, "x"),
    g(n[2], "image", 30, "x"),
    g(n[3], "money", 1000, "$"),
  ];
}

export function seedRoutines(lang: Lang = detectLang()): FlowRoutine[] {
  const r = dictFor(lang).seed.routines;
  const now = Date.now();
  const seg = (label: string, minutes: number, pillar: FlowRoutine["segments"][number]["pillar"]) => ({
    id: uid(), label, minutes, pillar, habitId: null,
  });

  /* Minuten und Säulen sind Struktur, nur die Beschriftungen kommen aus dem
     Wörterbuch — dadurch bleiben beide Sprachen zwangsläufig gleich getaktet. */
  const shapes: { emoji: string; steps: [number, FlowRoutine["segments"][number]["pillar"]][] }[] = [
    { emoji: "⚡", steps: [[15, "learn"], [5, "body"], [15, "learn"], [5, "body"], [15, "relax"]] },
    { emoji: "📚", steps: [[25, "learn"], [5, "relax"], [25, "learn"], [5, "relax"]] },
    { emoji: "🌅", steps: [[5, "body"], [10, "learn"], [10, "image"]] },
    { emoji: "💸", steps: [[20, "money"], [5, "relax"], [25, "money"]] },
  ];

  return shapes.map((shape, i) => ({
    id: uid(),
    name: r[i].name,
    emoji: shape.emoji,
    updatedAt: now,
    segments: shape.steps.map(([minutes, pillar], j) => seg(r[i].segs[j], minutes, pillar)),
  }));
}

export function blankData(lang: Lang = detectLang()): AppData {
  return {
    v: 2,
    habits: seedHabits(lang),
    goals: seedGoals(lang),
    days: {},
    weeks: {},
    routines: seedRoutines(lang),
    sessions: [],
    profile: { lang, updatedAt: Date.now() },
    updatedAt: Date.now(),
  };
}
