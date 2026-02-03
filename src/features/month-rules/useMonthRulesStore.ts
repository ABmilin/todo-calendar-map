// src/features/month-rules/useMonthRulesStore.ts
"use client";

import { create } from "zustand";
import type { MonthKey, MonthRule, RuleParamsByType, RuleType } from "./types";
import { createRule, MAX_RULES_PER_MONTH } from "./rules";
import { loadMonthRules, saveMonthRules, STORAGE_VERSION } from "./storage";

/** Partialだと number | undefined になりがちなので、undefinedを落とす */
type NoUndefPartial<T extends Record<string, number>> = {
  [K in keyof T]?: T[K]; // ← 値は number のまま（undefined を型に含めない）
};

type State = {
  hydrated: boolean;
  byMonth: Record<MonthKey, MonthRule[]>;

  hydrate: () => void;

  addRule: (monthKey: MonthKey, type: RuleType) => void;
  updateRule: (
    monthKey: MonthKey,
    ruleId: string,
    patch: Partial<Omit<MonthRule, "id" | "type">>
  ) => void;

  updateParams: <T extends RuleType>(
    monthKey: MonthKey,
    ruleId: string,
    patch: NoUndefPartial<RuleParamsByType[T]>
  ) => void;

  removeRule: (monthKey: MonthKey, ruleId: string) => void;
};

function persist(byMonth: Record<MonthKey, MonthRule[]>) {
  saveMonthRules({ version: STORAGE_VERSION, byMonth });
}

function stripUndefinedNumberPatch(patch: Record<string, unknown>) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export const useMonthRulesStore = create<State>((set, get) => ({
  hydrated: false,
  byMonth: {},

  hydrate: () => {
    if (get().hydrated) return;

    const snap = loadMonthRules();
    if (!snap) {
      set({ hydrated: true });
      return;
    }

    // ✅ version違いが来たら捨てる（将来マイグレーションするならここで分岐）
    if (snap.version !== STORAGE_VERSION) {
      set({ hydrated: true });
      return;
    }

    set({ hydrated: true, byMonth: snap.byMonth });
  },

  addRule: (monthKey, type) => {
    set((state) => {
      const current = state.byMonth[monthKey] ?? [];
      if (current.length >= MAX_RULES_PER_MONTH) return state;

      const next: Record<MonthKey, MonthRule[]> = {
        ...state.byMonth,
        [monthKey]: [...current, createRule(type)],
      };
      persist(next);
      return { ...state, byMonth: next };
    });
  },

  updateRule: (monthKey, ruleId, patch) => {
    set((state) => {
      const current = state.byMonth[monthKey] ?? [];
      const idx = current.findIndex((r) => r.id === ruleId);
      if (idx === -1) return state;

      const now = Date.now();
      const nextRule: MonthRule = {
        ...current[idx],
        ...patch,
        updatedAt: now,
      } as MonthRule;

      const nextArr = current.slice();
      nextArr[idx] = nextRule;

      const next: Record<MonthKey, MonthRule[]> = { ...state.byMonth, [monthKey]: nextArr };
      persist(next);
      return { ...state, byMonth: next };
    });
  },

  updateParams: (monthKey, ruleId, patch) => {
    set((state) => {
      const current = state.byMonth[monthKey] ?? [];
      const idx = current.findIndex((r) => r.id === ruleId);
      if (idx === -1) return state;

      const target = current[idx];
      const now = Date.now();

      // ✅ undefined を捨ててから params にマージ
      const clean = stripUndefinedNumberPatch(patch as Record<string, unknown>);

      const nextRule: MonthRule = {
        ...target,
        params: { ...target.params, ...clean },
        updatedAt: now,
      } as MonthRule;

      const nextArr = current.slice();
      nextArr[idx] = nextRule;

      const next: Record<MonthKey, MonthRule[]> = { ...state.byMonth, [monthKey]: nextArr };
      persist(next);
      return { ...state, byMonth: next };
    });
  },

  removeRule: (monthKey, ruleId) => {
    set((state) => {
      const current = state.byMonth[monthKey] ?? [];
      const nextArr = current.filter((r) => r.id !== ruleId);

      const next: Record<MonthKey, MonthRule[]> = { ...state.byMonth, [monthKey]: nextArr };
      persist(next);
      return { ...state, byMonth: next };
    });
  },
}));