// src/features/month-rules/types.ts
export type MonthKey = `${number}-${string}`; // 例: "2026-01"

export type RuleType =
  | "NO_TASK_AFTER_HOUR"
  | "WEEKDAY_MAX_TASKS"
  | "MAX_CONTINUOUS_WORK"
  | "START_DEADLINE_TASK_DAYS_BEFORE"
  | "SLEEP_BLOCK"
  | "AUTO_TRAVEL_BUFFER";

export type BaseRule<T extends RuleType, P extends Record<string, number>> = {
  id: string;
  type: T;
  enabled: boolean;
  params: P;
  createdAt: number;
  updatedAt: number;
};

export type NoTaskAfterHourRule = BaseRule<"NO_TASK_AFTER_HOUR", { hour: number }>;
export type WeekdayMaxTasksRule = BaseRule<"WEEKDAY_MAX_TASKS", { max: number }>;
export type MaxContinuousWorkRule = BaseRule<
  "MAX_CONTINUOUS_WORK",
  { maxWorkMin: number; breakMin: number }
>;
export type StartDeadlineTaskDaysBeforeRule = BaseRule<
  "START_DEADLINE_TASK_DAYS_BEFORE",
  { days: number }
>;
export type SleepBlockRule = BaseRule<"SLEEP_BLOCK", { startHour: number; endHour: number }>;
export type AutoTravelBufferRule = BaseRule<"AUTO_TRAVEL_BUFFER", { bufferMin: number }>;

export type MonthRule =
  | NoTaskAfterHourRule
  | WeekdayMaxTasksRule
  | MaxContinuousWorkRule
  | StartDeadlineTaskDaysBeforeRule
  | SleepBlockRule
  | AutoTravelBufferRule;

export type RuleParamsByType = {
  NO_TASK_AFTER_HOUR: NoTaskAfterHourRule["params"];
  WEEKDAY_MAX_TASKS: WeekdayMaxTasksRule["params"];
  MAX_CONTINUOUS_WORK: MaxContinuousWorkRule["params"];
  START_DEADLINE_TASK_DAYS_BEFORE: StartDeadlineTaskDaysBeforeRule["params"];
  SLEEP_BLOCK: SleepBlockRule["params"];
  AUTO_TRAVEL_BUFFER: AutoTravelBufferRule["params"];
};