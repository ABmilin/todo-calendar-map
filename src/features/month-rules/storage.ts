// src/features/month-rules/storage.ts
"use client";

import type { MonthKey, MonthRule, RuleType } from "./types";

export const STORAGE_VERSION = 1 as const;

const STORAGE_KEY = "todo-calendar-map:month-rules";

export type MonthRulesSnapshot = {
  version: typeof STORAGE_VERSION;
  byMonth: Record<MonthKey, MonthRule[]>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

const RULE_TYPES: RuleType[] = [
  "NO_TASK_AFTER_HOUR",
  "WEEKDAY_MAX_TASKS",
  "MAX_CONTINUOUS_WORK",
  "START_DEADLINE_TASK_DAYS_BEFORE",
  "SLEEP_BLOCK",
  "AUTO_TRAVEL_BUFFER",
];

function isRuleType(v: unknown): v is RuleType {
  return isString(v) && (RULE_TYPES as readonly string[]).includes(v);
}

function isNumberRecord(v: unknown): v is Record<string, number> {
  if (!isRecord(v)) return false;
  for (const val of Object.values(v)) {
    if (!isNumber(val)) return false;
  }
  return true;
}

/**
 * MonthRule の厳密な union 検証（paramsのキー一致）までやると重いので、
 * ここは「最低限壊れてない」ことだけ確認する（落ちない・壊れたデータは捨てる）。
 */
function isMonthRule(v: unknown): v is MonthRule {
  if (!isRecord(v)) return false;

  const id = v.id;
  const type = v.type;
  const enabled = v.enabled;
  const params = v.params;
  const createdAt = v.createdAt;
  const updatedAt = v.updatedAt;

  if (!isString(id)) return false;
  if (!isRuleType(type)) return false;
  if (!isBoolean(enabled)) return false;
  if (!isNumber(createdAt)) return false;
  if (!isNumber(updatedAt)) return false;
  if (!isNumberRecord(params)) return false;

  return true;
}

function getNumberField(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  return isNumber(v) ? v : null;
}

function getRecordField(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = obj[key];
  return isRecord(v) ? v : null;
}

/**
 * localStorage から読み込み
 * - SSR/ビルド時は null
 * - 壊れたデータは null or 部分的に復元（落ちないように）
 */
export function loadMonthRules(): MonthRulesSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const version = getNumberField(parsed, "version");
    if (version !== STORAGE_VERSION) return null;

    const byMonthRaw = getRecordField(parsed, "byMonth");
    if (!byMonthRaw) {
      return { version: STORAGE_VERSION, byMonth: {} as Record<MonthKey, MonthRule[]> };
    }

    // ✅ 型ガードで「正しい形だけ」復元（変なデータは捨てる）
    const byMonth: Record<MonthKey, MonthRule[]> = {} as Record<MonthKey, MonthRule[]>;
    for (const [k, v] of Object.entries(byMonthRaw)) {
      // MonthKey は "YYYY-MM" っぽい文字列なので、ここでは string のまま受けて入れる
      if (!isString(k)) continue;

      if (Array.isArray(v)) {
        const rules = v.filter(isMonthRule);
        // 空でも入れてOK。嫌なら rules.length>0 の時だけ入れるでも可。
        byMonth[k as MonthKey] = rules;
      }
    }

    return { version: STORAGE_VERSION, byMonth };
  } catch {
    return null;
  }
}

/** localStorage へ保存（SSR時は何もしない） */
export function saveMonthRules(snapshot: MonthRulesSnapshot): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 容量不足などでもアプリが落ちないように握りつぶす
  }
}

/** デバッグ用：保存データを消したいとき */
export function clearMonthRulesStorage(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}