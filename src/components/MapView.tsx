// src/components/MapView.tsx
"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-400">
      地図を読み込み中...
    </div>
  ),
});

export default function MapView() {
  // ✅ ここで枠や見出しを描かない（MapInnerに任せる）
  return <MapInner />;
}