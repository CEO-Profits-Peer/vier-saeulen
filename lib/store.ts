"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { blankData, seedRoutines } from "./seed";
import { isoWeek, todayKey, uid } from "./date";
import { dayStats } from "./score";
import type { AppData, Checkin, DayRec, FlowRoutine, Goal, Habit, Profile, RunState, Segment, Session } from "./types";

const STORE_KEY = "viersaeulen.v2";

const emptyDay = (): DayRec => ({ done: {}, tasks: [], checkin: {}, updatedAt: Date.now() });

interface Store {
  data: AppData;
  run: RunState | null;
  runMinimized: boolean;
  hydrated: boolean;
  lastSyncedAt: number | null;
  setHydrated: () => void;
  setData: (data: AppData) => void;
  setLastSynced: (t: number | null) => void;

  toggleHabitDone: (habitId: string) => void;
  addHabit: (h: Omit<Habit, "id" | "updatedAt">) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  addSeedRoutines: () => void;

  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setCheckin: (patch: Checkin) => void;

  setProfile: (patch: Partial<Omit<Profile, "updatedAt">>) => void;

  addGoal: (g: Omit<Goal, "id" | "updatedAt">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  bumpGoal: (id: string, amount: number) => void;

  setWeek: (patch: { wins?: string[]; lesson?: string; focus?: string }) => void;

  addRoutine: (r: Omit<FlowRoutine, "id" | "updatedAt">) => string;
  updateRoutine: (id: string, patch: Partial<FlowRoutine>) => void;
  removeRoutine: (id: string) => void;

  startRun: (routineId: string) => void;
  setRunMinimized: (value: boolean) => void;
  pauseRun: () => void;
  resumeRun: () => void;
  advanceRun: (opts?: { skipped?: boolean }) => void;
  stopRun: (save: boolean) => void;

  resetAll: () => void;
}

const touch = (d: AppData): AppData => ({ ...d, updatedAt: Date.now() });

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      data: blankData(),
      run: null,
      runMinimized: false,
      hydrated: false,
      lastSyncedAt: null,
      setHydrated: () => set({ hydrated: true }),
      setData: (data) => set({ data }),
      setLastSynced: (t) => set({ lastSyncedAt: t }),

      toggleHabitDone: (habitId) =>
        set((s) => {
          const key = todayKey();
          const days = { ...s.data.days };
          const rec: DayRec = { ...(days[key] ?? emptyDay()) };
          rec.done = { ...rec.done };
          if (rec.done[habitId]) delete rec.done[habitId];
          else rec.done[habitId] = true;
          rec.updatedAt = Date.now();
          days[key] = rec;
          const next = touch({ ...s.data, days });
          days[key] = { ...rec, t: dayStats(next, key).total };
          return { data: touch({ ...next, days: { ...days } }) };
        }),

      addHabit: (h) =>
        set((s) => ({ data: touch({ ...s.data, habits: [...s.data.habits, { ...h, id: uid(), updatedAt: Date.now() }] }) })),

      updateHabit: (id, patch) =>
        set((s) => ({
          data: touch({
            ...s.data,
            habits: s.data.habits.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: Date.now() } : h)),
          }),
        })),

      removeHabit: (id) =>
        set((s) => ({
          data: touch({
            ...s.data,
            habits: s.data.habits.map((h) => (h.id === id ? { ...h, deletedAt: Date.now(), updatedAt: Date.now() } : h)),
          }),
        })),

      addSeedRoutines: () =>
        set((s) => {
          const have = new Set(s.data.routines.filter((r) => !r.deletedAt).map((r) => r.name));
          const add = seedRoutines().filter((r) => !have.has(r.name));
          return { data: touch({ ...s.data, routines: [...s.data.routines, ...add] }) };
        }),

      addTask: (text) =>
        set((s) => {
          const key = todayKey();
          const rec = { ...(s.data.days[key] ?? emptyDay()) };
          rec.tasks = [...rec.tasks, { id: uid(), text, done: false }];
          rec.updatedAt = Date.now();
          return { data: touch({ ...s.data, days: { ...s.data.days, [key]: rec } }) };
        }),

      toggleTask: (id) =>
        set((s) => {
          const key = todayKey();
          const rec = { ...(s.data.days[key] ?? emptyDay()) };
          rec.tasks = rec.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
          rec.updatedAt = Date.now();
          return { data: touch({ ...s.data, days: { ...s.data.days, [key]: rec } }) };
        }),

      removeTask: (id) =>
        set((s) => {
          const key = todayKey();
          const rec = { ...(s.data.days[key] ?? emptyDay()) };
          rec.tasks = rec.tasks.filter((t) => t.id !== id);
          rec.updatedAt = Date.now();
          return { data: touch({ ...s.data, days: { ...s.data.days, [key]: rec } }) };
        }),

      setProfile: (patch) =>
        set((s) => ({
          data: touch({
            ...s.data,
            profile: {
              since: s.data.profile?.since ?? todayKey(),
              ...s.data.profile,
              ...patch,
              updatedAt: Date.now(),
            },
          }),
        })),

      setCheckin: (patch) =>
        set((s) => {
          const key = todayKey();
          const rec = { ...(s.data.days[key] ?? emptyDay()) };
          rec.checkin = { ...rec.checkin, ...patch };
          rec.updatedAt = Date.now();
          return { data: touch({ ...s.data, days: { ...s.data.days, [key]: rec } }) };
        }),

      addGoal: (g) =>
        set((s) => ({ data: touch({ ...s.data, goals: [...s.data.goals, { ...g, id: uid(), updatedAt: Date.now() }] }) })),

      updateGoal: (id, patch) =>
        set((s) => ({
          data: touch({
            ...s.data,
            goals: s.data.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g)),
          }),
        })),

      removeGoal: (id) =>
        set((s) => ({
          data: touch({
            ...s.data,
            goals: s.data.goals.map((g) => (g.id === id ? { ...g, deletedAt: Date.now(), updatedAt: Date.now() } : g)),
          }),
        })),

      bumpGoal: (id, amount) =>
        set((s) => ({
          data: touch({
            ...s.data,
            goals: s.data.goals.map((g) =>
              g.id === id ? { ...g, current: Math.round((g.current + amount) * 100) / 100, updatedAt: Date.now() } : g,
            ),
          }),
        })),

      setWeek: (patch) =>
        set((s) => {
          const wk = isoWeek(new Date());
          const cur = s.data.weeks[wk] ?? { wins: ["", "", ""], lesson: "", focus: "", updatedAt: 0 };
          return {
            data: touch({
              ...s.data,
              weeks: { ...s.data.weeks, [wk]: { ...cur, ...patch, updatedAt: Date.now() } },
            }),
          };
        }),

      addRoutine: (r) => {
        const id = uid();
        set((s) => ({ data: touch({ ...s.data, routines: [...s.data.routines, { ...r, id, updatedAt: Date.now() }] }) }));
        return id;
      },

      updateRoutine: (id, patch) =>
        set((s) => ({
          data: touch({
            ...s.data,
            routines: s.data.routines.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
          }),
        })),

      removeRoutine: (id) =>
        set((s) => ({
          data: touch({
            ...s.data,
            routines: s.data.routines.map((r) =>
              r.id === id ? { ...r, deletedAt: Date.now(), updatedAt: Date.now() } : r,
            ),
          }),
        })),

      /* ---------------- Flow ---------------- */
      startRun: (routineId) => {
        const now = Date.now();
        set({
          runMinimized: false,
          run: {
            routineId,
            index: 0,
            startedAt: now,
            segmentStartedAt: now,
            pausedAt: null,
            pausedTotal: 0,
            doneIds: [],
            minutes: {},
          },
        });
      },

      setRunMinimized: (value) => set({ runMinimized: value }),

      pauseRun: () => set((s) => (s.run && !s.run.pausedAt ? { run: { ...s.run, pausedAt: Date.now() } } : {})),

      resumeRun: () =>
        set((s) =>
          s.run?.pausedAt
            ? { run: { ...s.run, pausedTotal: s.run.pausedTotal + (Date.now() - s.run.pausedAt), pausedAt: null } }
            : {},
        ),

      advanceRun: (opts) =>
        set((s) => {
          const run = s.run;
          if (!run) return {};
          const routine = s.data.routines.find((r) => r.id === run.routineId);
          if (!routine) return { run: null };
          const seg: Segment | undefined = routine.segments[run.index];
          if (!seg) return { run: null };

          const now = Date.now();
          const skipped = opts?.skipped === true;
          const spentMs = now - run.segmentStartedAt - run.pausedTotal - (run.pausedAt ? now - run.pausedAt : 0);
          const credited = skipped ? Math.max(0, Math.round(spentMs / 60000)) : seg.minutes;

          const minutes = { ...run.minutes };
          minutes[seg.pillar] = (minutes[seg.pillar] ?? 0) + credited;

          let data = s.data;
          if (!skipped && seg.habitId) {
            const key = todayKey();
            const rec = { ...(data.days[key] ?? emptyDay()) };
            rec.done = { ...rec.done, [seg.habitId]: true };
            rec.updatedAt = now;
            data = touch({ ...data, days: { ...data.days, [key]: rec } });
          }

          const doneIds = skipped ? run.doneIds : [...run.doneIds, seg.id];
          const nextIndex = run.index + 1;

          if (nextIndex >= routine.segments.length) {
            const key = todayKey();
            const rec = { ...(data.days[key] ?? emptyDay()) };
            const flow = { ...(rec.flow ?? {}) };
            for (const [kind, mins] of Object.entries(minutes)) {
              flow[kind as keyof typeof flow] = (flow[kind as keyof typeof flow] ?? 0) + (mins ?? 0);
            }
            rec.flow = flow;
            rec.updatedAt = now;
            const session: Session = {
              id: uid(),
              routineId: routine.id,
              routineName: routine.name,
              startedAt: run.startedAt,
              endedAt: now,
              minutes,
              completed: doneIds.length,
              total: routine.segments.length,
            };
            return {
              run: null,
              data: touch({
                ...data,
                days: { ...data.days, [key]: rec },
                sessions: [...data.sessions, session].slice(-400),
              }),
            };
          }

          return {
            data,
            run: {
              ...run,
              index: nextIndex,
              segmentStartedAt: now,
              pausedAt: null,
              pausedTotal: 0,
              doneIds,
              minutes,
            },
          };
        }),

      stopRun: (save) =>
        set((s) => {
          const run = s.run;
          if (!run) return { run: null };
          if (!save) return { run: null };
          const routine = s.data.routines.find((r) => r.id === run.routineId);
          const now = Date.now();
          const key = todayKey();
          const rec = { ...(s.data.days[key] ?? emptyDay()) };
          const flow = { ...(rec.flow ?? {}) };
          for (const [kind, mins] of Object.entries(run.minutes)) {
            flow[kind as keyof typeof flow] = (flow[kind as keyof typeof flow] ?? 0) + (mins ?? 0);
          }
          rec.flow = flow;
          rec.updatedAt = now;
          const session: Session = {
            id: uid(),
            routineId: run.routineId,
            routineName: routine?.name ?? "Flow",
            startedAt: run.startedAt,
            endedAt: now,
            minutes: run.minutes,
            completed: run.doneIds.length,
            total: routine?.segments.length ?? run.doneIds.length,
          };
          const hasMinutes = Object.values(run.minutes).some((m) => (m ?? 0) > 0);
          return {
            run: null,
            data: hasMinutes
              ? touch({ ...s.data, days: { ...s.data.days, [key]: rec }, sessions: [...s.data.sessions, session].slice(-400) })
              : s.data,
          };
        }),

      resetAll: () => set({ data: blankData(), run: null, runMinimized: false, lastSyncedAt: null }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (s) => ({ data: s.data, run: s.run, runMinimized: s.runMinimized, lastSyncedAt: s.lastSyncedAt }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export const useData = () => useStore((s) => s.data);
