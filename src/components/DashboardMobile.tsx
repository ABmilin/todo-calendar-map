"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import TaskList from "@/components/TaskList";
import CalendarView from "@/components/CalendarView";
import MapView from "@/components/MapView";

/**
 * DashboardMobile
 * - スマホ横向き前提で「TODO / Calendar / Map」を同時表示（3ペイン）
 * - 縦向きの場合は案内を表示（仕様をシンプルに保つ）
 */
export default function DashboardMobile() {
  // null: 初期判定中（初回ちらつきを減らす）
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = () => setIsLandscape(mq.matches);

    // 初回反映
    onChange();

    // addEventListener が標準。古いブラウザは addListener をフォールバック。
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Deprecated だけど後方互換用に残っている実装がある  [oai_citation:1‡MDN ウェブドキュメント](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList?utm_source=chatgpt.com)
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // まだ判定できてない間は、レイアウト崩れ/ちらつき防止でプレースホルダ
  if (isLandscape === null) {
    return (
      <div className="min-h-[100dvh] w-full bg-black text-zinc-100 p-3">
        <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-950" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-black text-zinc-100">
      <div className="min-h-[100dvh] p-3 flex flex-col gap-3">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">TODO × Calendar × Map</div>
            <div className="text-xs text-zinc-500">
              スマホ版：横画面で3つ同時表示
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 text-right leading-tight">
            左で追加 → ドラッグ予定化 → 地図クリックで場所紐付け
          </div>
        </div>

        {/* 縦向きの案内 */}
        {!isLandscape ? (
          <div className="flex-1 min-h-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold">横画面で使ってください</div>
            <div className="mt-2 text-xs text-zinc-400 leading-relaxed">
              このスマホ版は「TODO / Calendar / Map」を同時に見られるよう、
              横向き（landscape）前提で設計しています。
              <br />
              端末を横にして再度お試しください。
            </div>
          </div>
        ) : (
          /* 横向き：3ペイン同時表示 */
          <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">
            <Pane title="TODO">
              <TaskList />
            </Pane>

            <Pane title="Calendar">
              <CalendarView />
            </Pane>

            <Pane title="Map">
              <MapView />
            </Pane>
          </div>
        )}
      </div>
    </div>
  );
}

function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 min-h-0 flex flex-col gap-2">
      <div className="text-xs font-semibold text-zinc-300 px-1">{title}</div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}