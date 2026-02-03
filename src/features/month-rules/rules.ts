// src/features/month-rules/rules.ts
import type { MonthRule, RuleParamsByType, RuleType } from "./types";

export const MAX_RULES_PER_MONTH = 3;

export type RuleDefMap = {
  [K in RuleType]: {
    label: string;
    description: string;
    defaults: RuleParamsByType[K];
  };
};

export const RULE_DEFS = {
  NO_TASK_AFTER_HOUR: {
    label: "◯時以降はタスクを入れない",
    description:
      "指定した時刻以降に開始するタスクがある場合に違反（予定の入れすぎ防止）。",
    defaults: { hour: 22 },
  },
  WEEKDAY_MAX_TASKS: {
    label: "平日は1日◯件以上入れない",
    description: "平日1日のタスク件数が上限を超える場合に違反。",
    defaults: { max: 5 },
  },
  MAX_CONTINUOUS_WORK: {
    label: "連続稼働は最大◯分（間に休憩◯分）",
    description:
      "連続作業が長すぎる場合に違反。将来的に休憩の自動挿入にも拡張可能。",
    defaults: { maxWorkMin: 180, breakMin: 10 },
  },
  START_DEADLINE_TASK_DAYS_BEFORE: {
    label: "締切系は◯日前までに着手タスクを作る",
    description:
      "締切があるタスクに対して、着手が遅い場合に警告（運用次第で自動生成も）。",
    defaults: { days: 7 },
  },
  SLEEP_BLOCK: {
    label: "睡眠ブロック（例: 1:00〜8:00）は侵さない",
    description: "睡眠時間帯にタスクが重なる場合に違反（生活リズム保護）。",
    defaults: { startHour: 1, endHour: 8 },
  },
  AUTO_TRAVEL_BUFFER: {
    label: "移動時間（前後◯分）を自動で確保",
    description:
      "場所があるタスクの前後にバッファが必要、という考え方。まずは警告から。",
    defaults: { bufferMin: 15 },
  },
} satisfies RuleDefMap;

export function formatRuleSummary(rule: MonthRule): string {
  switch (rule.type) {
    case "NO_TASK_AFTER_HOUR":
      return RULE_DEFS[rule.type].label.replace("◯", String(rule.params.hour));
    case "WEEKDAY_MAX_TASKS":
      return RULE_DEFS[rule.type].label.replace("◯", String(rule.params.max));
    case "MAX_CONTINUOUS_WORK":
      return `連続${rule.params.maxWorkMin}分（休憩${rule.params.breakMin}分）`;
    case "START_DEADLINE_TASK_DAYS_BEFORE":
      return `締切の${rule.params.days}日前までに着手`;
    case "SLEEP_BLOCK":
      return `睡眠 ${rule.params.startHour}:00〜${rule.params.endHour}:00 は侵さない`;
    case "AUTO_TRAVEL_BUFFER":
      return `移動バッファ 前後${rule.params.bufferMin}分`;
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createRule(type: RuleType): MonthRule {
  const now = Date.now();
  const id = makeId();

  // ★共通部分には「typeを入れない」(ここが修正点)
  const common = {
    id,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  } as const;

  // ★caseごとに type をリテラルで確定させる
  switch (type) {
    case "NO_TASK_AFTER_HOUR":
      return {
        ...common,
        type: "NO_TASK_AFTER_HOUR",
        params: { ...RULE_DEFS.NO_TASK_AFTER_HOUR.defaults },
      };
    case "WEEKDAY_MAX_TASKS":
      return {
        ...common,
        type: "WEEKDAY_MAX_TASKS",
        params: { ...RULE_DEFS.WEEKDAY_MAX_TASKS.defaults },
      };
    case "MAX_CONTINUOUS_WORK":
      return {
        ...common,
        type: "MAX_CONTINUOUS_WORK",
        params: { ...RULE_DEFS.MAX_CONTINUOUS_WORK.defaults },
      };
    case "START_DEADLINE_TASK_DAYS_BEFORE":
      return {
        ...common,
        type: "START_DEADLINE_TASK_DAYS_BEFORE",
        params: { ...RULE_DEFS.START_DEADLINE_TASK_DAYS_BEFORE.defaults },
      };
    case "SLEEP_BLOCK":
      return {
        ...common,
        type: "SLEEP_BLOCK",
        params: { ...RULE_DEFS.SLEEP_BLOCK.defaults },
      };
    case "AUTO_TRAVEL_BUFFER":
      return {
        ...common,
        type: "AUTO_TRAVEL_BUFFER",
        params: { ...RULE_DEFS.AUTO_TRAVEL_BUFFER.defaults },
      };
  }
}