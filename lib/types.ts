export type Pillar = "learn" | "body" | "image" | "money";
export type SegKind = Pillar | "relax";
export type Block = "morning" | "school" | "afternoon" | "evening";

export interface Habit {
  id: string;
  name: string;
  pillar: Pillar;
  block: Block;
  pts: number;
  days: number[];
  updatedAt: number;
  deletedAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  pillar: Pillar;
  target: number;
  unit: string;
  current: number;
  due: string;
  created: string;
  updatedAt: number;
  deletedAt?: number;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface Checkin {
  energy?: number | null;
  focus?: number | null;
  sleep?: number | null;
  screen?: number | null;
  win?: string;
  note?: string;
}

export interface DayRec {
  done: Record<string, boolean>;
  tasks: Task[];
  checkin: Checkin;
  /** Zielpunkte des Tages, eingefroren sobald der Tag vorbei ist */
  t?: number;
  /** Flow-Minuten je Säule */
  flow?: Partial<Record<SegKind, number>>;
  updatedAt: number;
}

export interface WeekRec {
  wins: string[];
  lesson: string;
  focus: string;
  updatedAt: number;
}

export interface Segment {
  id: string;
  label: string;
  minutes: number;
  pillar: SegKind;
  /** optional mit einer Routine verknüpft — erledigt sie beim Abschluss */
  habitId?: string | null;
}

export interface FlowRoutine {
  id: string;
  name: string;
  emoji: string;
  segments: Segment[];
  updatedAt: number;
  deletedAt?: number;
}

export interface Session {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  endedAt: number;
  minutes: Partial<Record<SegKind, number>>;
  completed: number;
  total: number;
}

export interface RunState {
  routineId: string;
  index: number;
  startedAt: number;
  segmentStartedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  doneIds: string[];
  minutes: Partial<Record<SegKind, number>>;
}

export interface AppData {
  v: 2;
  habits: Habit[];
  goals: Goal[];
  days: Record<string, DayRec>;
  weeks: Record<string, WeekRec>;
  routines: FlowRoutine[];
  sessions: Session[];
  updatedAt: number;
}

export const PILLARS: Record<Pillar, { label: string; de: string; cls: string; varName: string }> = {
  learn: { label: "Learn", de: "Lernen & Skills", cls: "p-learn", varName: "--learn" },
  body: { label: "Body", de: "Körper & Energie", cls: "p-body", varName: "--body" },
  image: { label: "Image", de: "Auftreten & Reichweite", cls: "p-image", varName: "--image" },
  money: { label: "Money", de: "Geld & Projekte", cls: "p-money", varName: "--money" },
};
export const PKEYS: Pillar[] = ["learn", "body", "image", "money"];
export const SEG_KINDS: Record<SegKind, { label: string; cls: string; varName: string }> = {
  learn: { label: "Lernen", cls: "p-learn", varName: "--learn" },
  body: { label: "Körper", cls: "p-body", varName: "--body" },
  image: { label: "Image", cls: "p-image", varName: "--image" },
  money: { label: "Geld", cls: "p-money", varName: "--money" },
  relax: { label: "Pause", cls: "p-relax", varName: "--relax" },
};
export const BLOCKS: Record<Block, string> = {
  morning: "Morgen",
  school: "Schule",
  afternoon: "Nachmittag",
  evening: "Abend",
};
export const BKEYS: Block[] = ["morning", "school", "afternoon", "evening"];
export const DAY_ABBR = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const ALLDAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const STREAK_MIN = 60;
