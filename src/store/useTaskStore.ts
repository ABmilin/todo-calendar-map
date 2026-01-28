"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Task } from "@/lib/types";

type ViewMode = "month" | "week" | "day";

type PickedLocation = {
  lat: number;
  lng: number;
  label: string;
};

type State = {
  tasks: Task[];
  selectedTaskId: string | null;
  viewMode: ViewMode;

  // ✅ Mapで直近選んだ場所（TODO追加欄で表示する用）
  pickedLocation: PickedLocation | null;

  addTask: (input: {
    title: string;
    dueAt?: string;
    durationMin: number;
    location?: Task["location"];
    memo?: string;
  }) => void;

  toggleDone: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  selectTask: (taskId: string | null) => void;

  scheduleTask: (taskId: string, startIso: string) => void;
  rescheduleTask: (taskId: string, startIso: string, endIso: string) => void;

  setTaskLocation: (taskId: string, loc: Task["location"]) => void;

  // ✅ 期限だけ更新（「→期限」ドラッグで使う）
  setDueAt: (taskId: string, dueIso?: string) => void;

  // ✅ メモ更新
  setMemo: (taskId: string, memo?: string) => void;

  // ✅ タスク全体を更新（編集UI用）
  updateTask: (taskId: string, patch: Partial<Omit<Task, "id">>) => void;

  setViewMode: (mode: ViewMode) => void;

  // ✅ pickedLocation操作
  setPickedLocation: (loc: PickedLocation | null) => void;

  loadFromStorage: () => void;
  saveToStorage: () => void;
};

const STORAGE_KEY = "todo-calendar-map.tasks.v1";

export const useTaskStore = create<State>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  viewMode: "week",

  pickedLocation: null,

  addTask: ({ title, dueAt, durationMin, location, memo }) => {
    const newTask: Task = {
      id: nanoid(),
      title,
      status: "todo",
      dueAt,
      durationMin,
      location,
      memo,
    };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
    get().saveToStorage();
  },

  toggleDone: (taskId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t
      ),
    }));
    get().saveToStorage();
  },

  deleteTask: (taskId) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: s.selectedTaskId === taskId ? null : s.selectedTaskId,
    }));
    get().saveToStorage();
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  scheduleTask: (taskId, startIso) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, scheduledStart: startIso } : t
      ),
    }));
    get().saveToStorage();
  },

  rescheduleTask: (taskId, startIso, endIso) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;

        const duration = Math.max(
          15,
          Math.round(
            (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
          )
        );

        return { ...t, scheduledStart: startIso, durationMin: duration };
      }),
    }));
    get().saveToStorage();
  },

  setTaskLocation: (taskId, loc) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, location: loc } : t)),
    }));
    get().saveToStorage();
  },

  setDueAt: (taskId, dueIso) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, dueAt: dueIso } : t)),
    }));
    get().saveToStorage();
  },

  setMemo: (taskId, memo) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, memo } : t)),
    }));
    get().saveToStorage();
  },

  updateTask: (taskId, patch) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    get().saveToStorage();
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setPickedLocation: (loc) => set({ pickedLocation: loc }),

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const tasks = JSON.parse(raw) as Task[];
      set({ tasks });
    } catch {
      // ignore
    }
  },

  saveToStorage: () => {
    try {
      const { tasks } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  },
}));