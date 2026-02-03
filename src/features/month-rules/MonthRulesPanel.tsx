// src/features/month-rules/MonthRulesPanel.tsx
"use client";

import { useState } from "react";
import MonthRulesEditor from "./MonthRulesEditor";
import { useMonthRuleWarnings } from "./useMonthRuleWarnings";
import { useTaskStore } from "@/store/useTaskStore";

export default function MonthRulesPanel() {
  const selectTask = useTaskStore((s) => s.selectTask);
  const [openWarnings, setOpenWarnings] = useState(true);

  const { hydrated, monthKey, warnings, warnCount, infoCount } = useMonthRuleWarnings();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 overflow-visible">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthRulesEditor />

        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs text-zinc-400">
            警告: <span className="text-zinc-100 font-semibold">{warnCount}</span> / 参考:{" "}
            <span className="text-zinc-200 font-semibold">{infoCount}</span>
          </div>

          <button
            type="button"
            className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 hover:bg-zinc-900"
            onClick={() => setOpenWarnings((v) => !v)}
            disabled={!hydrated}
            title="警告の表示/非表示"
          >
            {openWarnings ? "警告を隠す" : "警告を表示"}
          </button>
        </div>
      </div>

      {hydrated && openWarnings && (
        <div className="mt-2 space-y-2">
          {warnings.length === 0 ? (
            <div className="rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
              今月のルール警告はありません 🎉
            </div>
          ) : (
            warnings.slice(0, 12).map((w) => (
              <div
                key={w.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                        w.severity === "warn"
                          ? "border-red-500/40 text-red-300 bg-red-950/30"
                          : "border-amber-500/40 text-amber-200 bg-amber-950/20",
                      ].join(" ")}
                    >
                      {w.severity === "warn" ? "警告" : "参考"}
                    </span>

                    {w.dateKey ? (
                      <span className="text-[11px] text-zinc-500">{w.dateKey}</span>
                    ) : (
                      <span className="text-[11px] text-zinc-600">{monthKey}</span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-zinc-200">{w.message}</div>

                  {w.taskIds?.length ? (
                    <div className="mt-1 text-[11px] text-zinc-500">
                      関連タスク: {w.taskIds.length}件
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {w.taskIds?.[0] ? (
                    <button
                      type="button"
                      className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900"
                      onClick={() => selectTask(w.taskIds![0])}
                      title="関連タスクを編集対象にする"
                    >
                      タスクへ
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {warnings.length > 12 && (
            <div className="text-[11px] text-zinc-600">※ 表示は先頭12件まで</div>
          )}
        </div>
      )}
    </div>
  );
}