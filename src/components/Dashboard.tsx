"use client";

import { useEffect, useMemo, useState } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import DashboardDesktop from "@/components/DashboardDesktop";
import DashboardMobile from "@/components/DashboardMobile";

type UiMode = "auto" | "desktop" | "mobile";
const UI_KEY = "todo-calendar-map.uiMode.v1";

function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLgUp(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return isLgUp;
}

// localStorage から安全に読み取る（初期化用）
function readUiModeFromStorage(): UiMode {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (raw === "auto" || raw === "desktop" || raw === "mobile") return raw;
  } catch {
    // ignore
  }
  return "auto";
}

export default function Dashboard() {
  const { loadFromStorage } = useTaskStore();
  const isLgUp = useIsLgUp();

  // ✅ useEffect内setStateをやめて、初期化関数で読む（eslint警告回避）
  const [uiMode, setUiMode] = useState<UiMode>(() => readUiModeFromStorage());

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // uiMode 保存（副作用として正しい）
  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, uiMode);
    } catch {
      // ignore
    }
  }, [uiMode]);

  const effectiveMode: "desktop" | "mobile" = useMemo(() => {
    if (uiMode === "desktop") return "desktop";
    if (uiMode === "mobile") return "mobile";
    return isLgUp ? "desktop" : "mobile";
  }, [uiMode, isLgUp]);

  const cycleMode = () => {
    setUiMode((m) =>
      m === "auto" ? "desktop" : m === "desktop" ? "mobile" : "auto"
    );
  };

  return (
    <div className="relative">
      <button
        onClick={cycleMode}
        className="fixed right-3 top-3 z-[9999] rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 border border-zinc-700"
        title="表示モード切替（自動 → PC → スマホ）"
      >
        表示:{" "}
        {uiMode === "auto" ? "自動" : uiMode === "desktop" ? "PC" : "スマホ"}
      </button>

      {effectiveMode === "desktop" ? <DashboardDesktop /> : <DashboardMobile />}
    </div>
  );
}