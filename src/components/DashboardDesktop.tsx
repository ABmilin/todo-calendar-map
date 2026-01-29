"use client";

import TaskList from "@/components/TaskList";
import CalendarView from "@/components/CalendarView";
import MapView from "@/components/MapView";

export default function DashboardDesktop() {
  return (
    <div className="h-screen w-full bg-black text-zinc-100">
      <div className="h-full p-4">
        <div className="mb-3 flex items-center justify-between">
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

        <div className="grid h-[calc(100%-48px)] grid-cols-1 gap-4 lg:grid-cols-3">
          <TaskList />
          <CalendarView />
          <MapView />
        </div>
      </div>
    </div>
  );
}