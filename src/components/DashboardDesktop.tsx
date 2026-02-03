"use client";

import TaskList from "@/components/TaskList";
import CalendarView from "@/components/CalendarView";
import MapView from "@/components/MapView";
import MonthRulesPanel from "@/features/month-rules/MonthRulesPanel";

export default function DashboardDesktop() {
  return (
    <div className="min-h-screen w-full bg-black text-zinc-100">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold">TODO × Calendar × Map</div>
            <div className="text-xs text-zinc-500">
              “いつ・どこで・なにをするか” を1画面で見える化
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            左でタスク追加 → ドラッグで予定化 → 地図クリックで場所紐付け
          </div>
        </div>

        {/* 上部バー */}
        <MonthRulesPanel />

        {/* 3カラム：縮めず、最低高さを持たせて足りなければスクロール */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-h-[620px]">
            <TaskList />
          </div>
          <div className="min-h-[620px]">
            <CalendarView />
          </div>
          <div className="min-h-[620px]">
            <MapView />
          </div>
        </div>
      </div>
    </div>
  );
}