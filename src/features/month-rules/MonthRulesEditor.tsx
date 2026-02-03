// src/features/month-rules/MonthRulesEditor.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { RULE_DEFS, formatRuleSummary, MAX_RULES_PER_MONTH } from "./rules";
import type { MonthKey, MonthRule, RuleType } from "./types";
import { useMonthRulesStore } from "./useMonthRulesStore";

function monthKeyOf(d: Date): MonthKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const EMPTY_RULES: MonthRule[] = [];

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
};

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const rid = useId();
  const id = `mr_num_${rid}`;

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-300" htmlFor={id}>
      <span className="whitespace-nowrap">{label}</span>
      <input
        id={id}
        aria-label={label}
        className="h-8 w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-100"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = clampInt(Number(e.target.value), min, max);
          onChange(v);
        }}
      />
    </label>
  );
}

type RuleChipProps = {
  rule: MonthRule;
  onToggle: () => void;
  onRemove: () => void;
  // 数値だけが来ればOK（undefinedを混ぜない）
  onChangeParams: (patch: Record<string, number>) => void;
};

function RuleChip({ rule, onToggle, onRemove, onChangeParams }: RuleChipProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative shrink-0">
      <div
        className={[
          "flex min-w-0 items-center gap-2 rounded-full border px-3 py-1 text-xs",
          rule.enabled
            ? "border-zinc-700 bg-zinc-900/60 text-zinc-100"
            : "border-zinc-800 bg-zinc-950/60 text-zinc-500",
        ].join(" ")}
      >
        <button
          type="button"
          className="mr-1 h-4 w-4 shrink-0 rounded border border-zinc-700"
          aria-label={rule.enabled ? "ルールを無効化" : "ルールを有効化"}
          onClick={onToggle}
        />

        <span className="min-w-0 max-w-[52vw] truncate">{formatRuleSummary(rule)}</span>

        <button
          type="button"
          className="ml-1 shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200 hover:bg-zinc-800/50"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "閉じる" : "編集"}
        </button>

        <button
          type="button"
          className="shrink-0 rounded-md border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-900"
          onClick={onRemove}
        >
          削除
        </button>
      </div>

      {editing && (
        <div className="absolute left-0 z-20 mt-2 w-[min(520px,92vw)] rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-lg">
          <div className="mb-2 text-xs text-zinc-400">
            {RULE_DEFS[rule.type].description}
          </div>

          {rule.type === "NO_TASK_AFTER_HOUR" && (
            <NumberField
              label="何時以降？"
              value={rule.params.hour}
              min={0}
              max={23}
              onChange={(hour) => onChangeParams({ hour })}
            />
          )}

          {rule.type === "WEEKDAY_MAX_TASKS" && (
            <NumberField
              label="平日の上限（件）"
              value={rule.params.max}
              min={1}
              max={50}
              onChange={(max) => onChangeParams({ max })}
            />
          )}

          {rule.type === "MAX_CONTINUOUS_WORK" && (
            <div className="flex flex-wrap gap-3">
              <NumberField
                label="連続稼働 上限（分）"
                value={rule.params.maxWorkMin}
                min={30}
                max={600}
                onChange={(maxWorkMin) => onChangeParams({ maxWorkMin })}
              />
              <NumberField
                label="休憩の最小（分）"
                value={rule.params.breakMin}
                min={1}
                max={120}
                onChange={(breakMin) => onChangeParams({ breakMin })}
              />
            </div>
          )}

          {rule.type === "START_DEADLINE_TASK_DAYS_BEFORE" && (
            <NumberField
              label="締切の何日前？（日）"
              value={rule.params.days}
              min={1}
              max={60}
              onChange={(days) => onChangeParams({ days })}
            />
          )}

          {rule.type === "SLEEP_BLOCK" && (
            <div className="flex flex-wrap gap-3">
              <NumberField
                label="睡眠開始（時）"
                value={rule.params.startHour}
                min={0}
                max={23}
                onChange={(startHour) => onChangeParams({ startHour })}
              />
              <NumberField
                label="睡眠終了（時）"
                value={rule.params.endHour}
                min={0}
                max={23}
                onChange={(endHour) => onChangeParams({ endHour })}
              />
            </div>
          )}

          {rule.type === "AUTO_TRAVEL_BUFFER" && (
            <NumberField
              label="前後バッファ（分）"
              value={rule.params.bufferMin}
              min={0}
              max={240}
              onChange={(bufferMin) => onChangeParams({ bufferMin })}
            />
          )}

          <div className="mt-3 text-xs text-zinc-500">
            ※ 次のステップで、この数値を使って「警告」を出す判定ロジックを足します。
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonthRulesEditor() {
  const monthKey = useMemo(() => monthKeyOf(new Date()), []);

  const hydrate = useMonthRulesStore((s) => s.hydrate);
  const hydrated = useMonthRulesStore((s) => s.hydrated);

  // ✅ selector で「毎回新しい配列」を返さない（空は定数参照）
  const rules = useMonthRulesStore((s) => s.byMonth[monthKey] ?? EMPTY_RULES);

  const addRule = useMonthRulesStore((s) => s.addRule);
  const updateRule = useMonthRulesStore((s) => s.updateRule);
  const updateParams = useMonthRulesStore((s) => s.updateParams);
  const removeRule = useMonthRulesStore((s) => s.removeRule);

  const [openAdd, setOpenAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<RuleType>("NO_TASK_AFTER_HOUR");

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  // ✅ Escで閉じる
  useEffect(() => {
    if (!openAdd) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAdd(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAdd]);

  const canAdd = hydrated && rules.length < MAX_RULES_PER_MONTH;

  return (
    // ✅ 横長バーの中身：w-full + min-w-0 を必ず入れる
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      {/* タイトル領域は縮めない */}
      <div className="mr-1 flex shrink-0 items-center gap-2">
        <div className="text-sm font-semibold">月のやらないことルール</div>
        <div className="text-xs text-zinc-500">{monthKey}</div>
      </div>

      {/* ルールチップは “伸びる＆縮められる” にする */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {rules.map((r) => (
          <RuleChip
            key={r.id}
            rule={r}
            onToggle={() => updateRule(monthKey, r.id, { enabled: !r.enabled })}
            onRemove={() => removeRule(monthKey, r.id)}
            onChangeParams={(patch) => updateParams(monthKey, r.id, patch)}
          />
        ))}
      </div>

      {/* 追加ボタンは右側で縮まない */}
      <div className="shrink-0">
        <button
          type="button"
          disabled={!canAdd}
          className={[
            "h-8 rounded-lg border px-3 text-sm",
            canAdd
              ? "border-zinc-700 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800/60"
              : "border-zinc-900 bg-zinc-950 text-zinc-600",
          ].join(" ")}
          onClick={() => setOpenAdd(true)}
        >
          ＋ ルール追加
        </button>
      </div>

      {/* ✅ 被り防止：モーダル化（Map/Calendarの上に“自然に”出す） */}
      {openAdd && canAdd && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ルール追加"
        >
          {/* 背景 */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="閉じる"
            onClick={() => setOpenAdd(false)}
          />

          {/* パネル */}
          <div className="relative mt-12 w-[min(560px,94vw)] rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">ルールを選択</div>
              <button
                type="button"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[12px] text-zinc-300 hover:bg-zinc-900"
                onClick={() => setOpenAdd(false)}
              >
                閉じる
              </button>
            </div>

            <label className="block text-xs text-zinc-400" htmlFor="mr_rule_type_select">
              ルール種別
            </label>
            <select
              id="mr_rule_type_select"
              aria-label="ルール種別"
              className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-100"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as RuleType)}
            >
              {Object.entries(RULE_DEFS).map(([type, def]) => (
                <option key={type} value={type}>
                  {def.label}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-zinc-500">
              {RULE_DEFS[selectedType].description}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="h-9 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300 hover:bg-zinc-900"
                onClick={() => setOpenAdd(false)}
              >
                キャンセル
              </button>

              <button
                type="button"
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100 hover:bg-zinc-800/60"
                onClick={() => {
                  addRule(monthKey, selectedType);
                  setOpenAdd(false);
                }}
              >
                追加する
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-600">
              ※ 月あたり最大 {MAX_RULES_PER_MONTH} 件まで
            </div>
          </div>
        </div>
      )}
    </div>
  );
}