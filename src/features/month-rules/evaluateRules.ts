// src/features/month-rules/evaluateRules.ts
import type { MonthKey, MonthRule, RuleType } from "./types";

export type WarningSeverity = "info" | "warn";

export type RuleWarning = {
  id: string;
  monthKey: MonthKey;
  ruleId: string;
  ruleType: RuleType;
  severity: WarningSeverity;
  message: string;
  /** 関連タスク（任意） */
  taskIds?: string[];
  /** どの日付の話か（任意） */
  dateKey?: string; // "YYYY-MM-DD"
};

/**
 * ルール判定に必要な最小限のTask shape（実タスク型が何であれこれが取れればOK）
 */
export type EvalTask = {
  id: string;
  title?: string;
  status?: string; // "done" など
  scheduledStart?: string; // ISO
  dueAt?: string; // ISO
  durationMin?: number;
  location?: {
    label?: string;
    lat?: number;
    lng?: number;
  };
};

function monthKeyOf(d: Date): MonthKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as MonthKey;
}

function inMonth(iso: string | undefined, monthKey: MonthKey): boolean {
  if (!iso) return false;
  // ISOの先頭 "YYYY-MM" を使う（Zでもローカルでもそこは変わりにくい）
  return iso.slice(0, 7) === monthKey;
}

function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWeekday(d: Date): boolean {
  const w = d.getDay(); // 0 Sun ... 6 Sat
  return w >= 1 && w <= 5;
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function endTime(start: Date, durationMin: number): Date {
  return new Date(start.getTime() + durationMin * 60000);
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * SLEEP_BLOCK: startHour〜endHour が同日内で完結しないパターン（例 1:00〜8:00 は完結、23:00〜7:00 は跨ぐ）
 * → 判定用に「その日の睡眠区間（場合によっては前日分も）」を生成して重なりをチェック
 */
function overlapsSleepBlock(
  taskStart: Date,
  taskEnd: Date,
  startHour: number,
  endHour: number
): boolean {
  const base = new Date(taskStart);
  base.setHours(0, 0, 0, 0);

  const make = (dayOffset: number) => {
    const d0 = new Date(base.getTime() + dayOffset * 86400000);
    const s = new Date(d0);
    s.setHours(startHour, 0, 0, 0);

    const e = new Date(d0);
    e.setHours(endHour, 0, 0, 0);

    // 跨ぐ場合は翌日へ
    if (endHour <= startHour) e.setTime(e.getTime() + 86400000);

    return { s, e };
  };

  // taskが夜中跨ぐこともあるので、前日・当日・翌日をざっくり見る
  const blocks = [make(-1), make(0), make(1)];
  return blocks.some((b) => overlap(taskStart, taskEnd, b.s, b.e));
}

function makeId(prefix: string, parts: Array<string | number | undefined>) {
  return `${prefix}_${parts.filter((x) => x !== undefined).join("_")}`;
}

export function evaluateMonthRules(args: {
  monthKey?: MonthKey;
  rules: MonthRule[];
  tasks: EvalTask[];
}): RuleWarning[] {
  const monthKey = args.monthKey ?? monthKeyOf(new Date());
  const enabledRules = args.rules.filter((r) => r.enabled);

  // この月に関係しそうなタスクだけ
  // - scheduledStart が月内
  // - dueAt が月内
  const scoped = args.tasks.filter(
    (t) => inMonth(t.scheduledStart, monthKey) || inMonth(t.dueAt, monthKey)
  );

  const warnings: RuleWarning[] = [];

  const add = (w: RuleWarning) => warnings.push(w);

  // 予定がある（scheduledStart）タスクだけ（判定に多用）
  const scheduled = scoped
    .map((t) => {
      const s = parseDate(t.scheduledStart);
      if (!s) return null;
      const durationMin = typeof t.durationMin === "number" ? t.durationMin : 60;
      const e = endTime(s, durationMin);
      return { task: t, s, e, durationMin };
    })
    .filter(Boolean) as Array<{ task: EvalTask; s: Date; e: Date; durationMin: number }>;

  // ------- ルール別判定 -------
  for (const rule of enabledRules) {
    switch (rule.type) {
      case "NO_TASK_AFTER_HOUR": {
        const hour = rule.params.hour;
        const bad = scheduled.filter((x) => x.s.getHours() >= hour);

        if (bad.length) {
          add({
            id: makeId("warn", [monthKey, rule.id, "NO_TASK_AFTER_HOUR"]),
            monthKey,
            ruleId: rule.id,
            ruleType: rule.type,
            severity: "warn",
            message: `${hour}時以降に開始するタスクがあります（${bad.length}件）`,
            taskIds: bad.map((x) => x.task.id),
          });
        }
        break;
      }

      case "WEEKDAY_MAX_TASKS": {
        const max = rule.params.max;

        const byDay = new Map<string, string[]>(); // dateKey -> taskIds
        for (const x of scheduled) {
          if (x.task.status === "done") continue;
          if (!isWeekday(x.s)) continue;
          const dk = dateKeyLocal(x.s);
          const arr = byDay.get(dk) ?? [];
          arr.push(x.task.id);
          byDay.set(dk, arr);
        }

        for (const [dk, ids] of byDay) {
          if (ids.length > max) {
            add({
              id: makeId("warn", [monthKey, rule.id, "WEEKDAY_MAX_TASKS", dk]),
              monthKey,
              ruleId: rule.id,
              ruleType: rule.type,
              severity: "warn",
              dateKey: dk,
              message: `平日 ${dk} のタスクが ${ids.length} 件（上限 ${max} 件）`,
              taskIds: ids,
            });
          }
        }
        break;
      }

      case "MAX_CONTINUOUS_WORK": {
        const maxWorkMin = rule.params.maxWorkMin;
        const breakMin = rule.params.breakMin;

        // 日ごとに並べて“連続稼働”を計算
        const byDay = new Map<string, Array<{ s: Date; e: Date; id: string }>>();
        for (const x of scheduled) {
          if (x.task.status === "done") continue;
          const dk = dateKeyLocal(x.s);
          const arr = byDay.get(dk) ?? [];
          arr.push({ s: x.s, e: x.e, id: x.task.id });
          byDay.set(dk, arr);
        }

        for (const [dk, arr] of byDay) {
          arr.sort((a, b) => a.s.getTime() - b.s.getTime());

          let runStart = arr[0]?.s;
          let runEnd = arr[0]?.e;
          let runIds = arr[0] ? [arr[0].id] : [];

          for (let i = 1; i < arr.length; i++) {
            const prevEnd = runEnd!;
            const cur = arr[i];
            const gap = minutesBetween(prevEnd, cur.s);

            // gap が breakMin 以上なら “連続” が切れる
            if (gap >= breakMin) {
              // run を確定して評価
              const runLen = minutesBetween(runStart!, prevEnd);
              if (runLen > maxWorkMin) {
                add({
                  id: makeId("warn", [monthKey, rule.id, "MAX_CONTINUOUS_WORK", dk, runLen]),
                  monthKey,
                  ruleId: rule.id,
                  ruleType: rule.type,
                  severity: "warn",
                  dateKey: dk,
                  message: `${dk} の連続稼働が ${runLen} 分（上限 ${maxWorkMin} 分 / 休憩 ${breakMin} 分）`,
                  taskIds: runIds,
                });
              }

              // 新しいrun開始
              runStart = cur.s;
              runEnd = cur.e;
              runIds = [cur.id];
              continue;
            }

            // 連続扱い → run延長
            runEnd = new Date(Math.max(runEnd!.getTime(), cur.e.getTime()));
            runIds.push(cur.id);
          }

          // 最後のrun評価
          if (runStart && runEnd) {
            const runLen = minutesBetween(runStart, runEnd);
            if (runLen > maxWorkMin) {
              add({
                id: makeId("warn", [monthKey, rule.id, "MAX_CONTINUOUS_WORK", dk, "tail"]),
                monthKey,
                ruleId: rule.id,
                ruleType: rule.type,
                severity: "warn",
                dateKey: dk,
                message: `${dk} の連続稼働が ${runLen} 分（上限 ${maxWorkMin} 分 / 休憩 ${breakMin} 分）`,
                taskIds: runIds,
              });
            }
          }
        }

        break;
      }

      case "START_DEADLINE_TASK_DAYS_BEFORE": {
        const days = rule.params.days;

        for (const t of scoped) {
          if (!t.dueAt) continue;
          if (t.status === "done") continue;

          const due = parseDate(t.dueAt);
          if (!due) continue;

          const threshold = new Date(due.getTime() - days * 86400000);

          const start = parseDate(t.scheduledStart);
          // 「締切系は◯日前までに着手タスク」＝
          // scheduledStart が無い or threshold より後なら警告
          if (!start || start > threshold) {
            add({
              id: makeId("warn", [monthKey, rule.id, "START_DEADLINE", t.id]),
              monthKey,
              ruleId: rule.id,
              ruleType: rule.type,
              severity: "warn",
              message: `締切 ${t.dueAt.slice(0, 10)} のタスクが「${days}日前まで着手」になっていない可能性`,
              taskIds: [t.id],
            });
          }
        }
        break;
      }

      case "SLEEP_BLOCK": {
        const { startHour, endHour } = rule.params;

        const bad = scheduled.filter((x) => {
          if (x.task.status === "done") return false;
          return overlapsSleepBlock(x.s, x.e, startHour, endHour);
        });

        if (bad.length) {
          add({
            id: makeId("warn", [monthKey, rule.id, "SLEEP_BLOCK"]),
            monthKey,
            ruleId: rule.id,
            ruleType: rule.type,
            severity: "warn",
            message: `睡眠ブロック（${startHour}:00〜${endHour}:00）に重なるタスクがあります（${bad.length}件）`,
            taskIds: bad.map((x) => x.task.id),
          });
        }
        break;
      }

      case "AUTO_TRAVEL_BUFFER": {
        const bufferMin = rule.params.bufferMin;

        // 同日内の「場所あり」タスクの間隔を見る（初期は“警告だけ”）
        const byDay = new Map<string, Array<{ s: Date; e: Date; id: string }>>();
        for (const x of scheduled) {
          if (x.task.status === "done") continue;
          const hasLoc = Boolean(x.task.location?.label || (x.task.location?.lat && x.task.location?.lng));
          if (!hasLoc) continue;
          const dk = dateKeyLocal(x.s);
          const arr = byDay.get(dk) ?? [];
          arr.push({ s: x.s, e: x.e, id: x.task.id });
          byDay.set(dk, arr);
        }

        for (const [dk, arr] of byDay) {
          arr.sort((a, b) => a.s.getTime() - b.s.getTime());
          for (let i = 0; i < arr.length - 1; i++) {
            const a = arr[i];
            const b = arr[i + 1];
            const gap = minutesBetween(a.e, b.s);
            if (gap < bufferMin) {
              add({
                id: makeId("warn", [monthKey, rule.id, "TRAVEL_BUFFER", dk, i]),
                monthKey,
                ruleId: rule.id,
                ruleType: rule.type,
                severity: "info",
                dateKey: dk,
                message: `${dk} の場所ありタスク間の余白が ${gap} 分（推奨 ${bufferMin} 分以上）`,
                taskIds: [a.id, b.id],
              });
            }
          }
        }
        break;
      }
    }
  }

  // 見やすい順に軽く整列
  const severityRank: Record<WarningSeverity, number> = { warn: 0, info: 1 };
  warnings.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    if (a.dateKey && b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return a.message.localeCompare(b.message);
  });

  return warnings;
}