"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./MapInner").then((m) => m.default), {
  ssr: false,
});

export default function MapView() {
  return <MapInner />;
}