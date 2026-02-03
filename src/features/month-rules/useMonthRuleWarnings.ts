// src/features/month-rules/useMonthRuleWarnings.ts
"use client";

import { useEffect, useMemo } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useMonthRulesStore } from "./useMonthRulesStore";
import { evaluateMonthRules, type RuleWarning, type WarningSeverity } from "./evaluateRules";
import type { MonthKey, MonthRule } from "./types";

function monthKeyOf(d: Date): MonthKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as MonthKey;
}

const EMPTY_RULES: MonthRule[] = [];

type SeverityLevel = "none" | WarningSeverity;

function maxSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  // warn > info > none
  if (a === "warn" || b === "warn") return "warn";
  if (a === "info" || b === "info") return "info";
  return "none";
}

export function useMonthRuleWarnings(monthKey?: MonthKey) {
  const key = monthKey ?? monthKeyOf(new Date());

  const hydrate = useMonthRulesStore((s) => s.hydrate);
  const hydrated = useMonthRulesStore((s) => s.hydrated);
  const rules = useMonthRulesStore((s) => s.byMonth[key] ?? EMPTY_RULES);

  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const warnings = useMemo<RuleWarning[]>(() => {
    if (!hydrated) return [];
    return evaluateMonthRules({ monthKey: key, rules, tasks });
  }, [hydrated, key, rules, tasks]);

  const warnCount = useMemo(
    () => warnings.filter((w) => w.severity === "warn").length,
    [warnings]
  );
  const infoCount = useMemo(
    () => warnings.filter((w) => w.severity === "info").length,
    [warnings]
  );

  // taskId -> そのタスクに付いた最大のseverity（warn/info）
  const severityByTaskId = useMemo(() => {
    const map = new Map<string, SeverityLevel>();
    for (const w of warnings) {
      const ids = w.taskIds ?? [];
      for (const id of ids) {
        const prev = map.get(id) ?? "none";
        map.set(id, maxSeverity(prev, w.severity));
      }
    }
    return map;
  }, [warnings]);

  return { monthKey: key, hydrated, rules, warnings, warnCount, infoCount, severityByTaskId };
}