import { ALLDAYS, WEEKDAYS, type AppData, type FlowRoutine, type Goal, type Habit } from "./types";
import { addDays, dkey, todayKey, uid } from "./date";

export function seedHabits(): Habit[] {
  const now = Date.now();
  const h = (name: string, pillar: Habit["pillar"], block: Habit["block"], pts: number, days: number[]): Habit => ({
    id: uid(), name, pillar, block, pts, days, updatedAt: now,
  });
  return [
    h("Pünktlich aufstehen", "body", "morning", 10, ALLDAYS),
    h("Wasser + Frühstück", "body", "morning", 5, ALLDAYS),
    h("5 Min Tagesplan schreiben", "learn", "morning", 5, ALLDAYS),
    h("Im Unterricht mitschreiben", "learn", "school", 10, WEEKDAYS),
    h("Einmal melden / etwas sagen", "image", "school", 10, WEEKDAYS),
    h("Mit jemandem Neuem reden", "image", "school", 5, WEEKDAYS),
    h("Hausaufgaben zuerst", "learn", "afternoon", 15, WEEKDAYS),
    h("Training / Sport", "body", "afternoon", 15, [1, 2, 4, 5, 6]),
    h("30 Min Skill üben", "learn", "afternoon", 10, ALLDAYS),
    h("1 Post / Video / Foto", "image", "afternoon", 10, [1, 3, 5, 0]),
    h("1 Aktion für Geld", "money", "afternoon", 10, WEEKDAYS),
    h("Ausgaben notiert", "money", "evening", 5, ALLDAYS),
    h("Handy weg, 30 Min vor Schlaf", "body", "evening", 10, ALLDAYS),
    h("15 Min lesen", "learn", "evening", 10, ALLDAYS),
  ];
}

export function seedGoals(): Goal[] {
  const now = Date.now();
  const due = dkey(addDays(new Date(), 90));
  const g = (title: string, pillar: Goal["pillar"], target: number, unit: string): Goal => ({
    id: uid(), title, pillar, target, unit, current: 0, due, created: todayKey(), updatedAt: now,
  });
  return [
    g("Lernstunden diese Season", "learn", 100, "h"),
    g("Trainings absolviert", "body", 60, "x"),
    g("Posts veröffentlicht", "image", 30, "x"),
    g("Gespart", "money", 1000, "$"),
  ];
}

export function seedRoutines(): FlowRoutine[] {
  const now = Date.now();
  const seg = (label: string, minutes: number, pillar: FlowRoutine["segments"][number]["pillar"]) => ({
    id: uid(), label, minutes, pillar, habitId: null,
  });
  return [
    {
      id: uid(), name: "Power Hour", emoji: "⚡", updatedAt: now,
      segments: [
        seg("Lesen", 15, "learn"),
        seg("Aufstehen & bewegen", 5, "body"),
        seg("Lernen", 15, "learn"),
        seg("Workout", 5, "body"),
        seg("Chill", 15, "relax"),
      ],
    },
    {
      id: uid(), name: "Study Sprint", emoji: "📚", updatedAt: now,
      segments: [
        seg("Fokus", 25, "learn"),
        seg("Pause", 5, "relax"),
        seg("Fokus", 25, "learn"),
        seg("Pause", 5, "relax"),
      ],
    },
    {
      id: uid(), name: "Morgen-Kickstart", emoji: "🌅", updatedAt: now,
      segments: [
        seg("Bewegen", 5, "body"),
        seg("Tag planen", 10, "learn"),
        seg("Content-Idee", 10, "image"),
      ],
    },
    {
      id: uid(), name: "Money Block", emoji: "💸", updatedAt: now,
      segments: [
        seg("Angebote / Nachrichten", 20, "money"),
        seg("Pause", 5, "relax"),
        seg("Umsetzen", 25, "money"),
      ],
    },
  ];
}

export function blankData(): AppData {
  return {
    v: 2,
    habits: seedHabits(),
    goals: seedGoals(),
    days: {},
    weeks: {},
    routines: seedRoutines(),
    sessions: [],
    updatedAt: Date.now(),
  };
}
