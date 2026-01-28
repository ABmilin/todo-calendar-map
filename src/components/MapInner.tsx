"use client";

import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type Icon } from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { useTaskStore } from "@/store/useTaskStore";

// Leaflet marker images (Next対応)
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER: [number, number] = [35.681236, 139.767125]; // 東京駅

function createDefaultIcon(): Icon {
  const iconUrl =
    (marker1x as unknown as { src?: string })?.src ??
    (marker1x as unknown as string);

  const iconRetinaUrl =
    (marker2x as unknown as { src?: string })?.src ??
    (marker2x as unknown as string);

  const shadowUrl =
    (markerShadow as unknown as { src?: string })?.src ??
    (markerShadow as unknown as string);

  return new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const DEFAULT_ICON = createDefaultIcon();

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ✅ center stateが変わったら地図を動かす
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export default function MapInner() {
  const {
    tasks,
    selectedTaskId,
    updateTask, // ✅ ここを使う
    pickedLocation,
    setPickedLocation,
  } = useTaskStore();

  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);

  // ローカルの「最後にクリックした位置」
  const [lastPicked, setLastPicked] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const tasksWithLoc = useMemo(() => {
    return tasks.filter((t) => t.location);
  }, [tasks]);

  // ✅ タスク選択が変わったら、その場所へ地図を移動（locationがある場合）
  useEffect(() => {
    if (!selectedTaskId) return;

    const t = tasks.find((x) => x.id === selectedTaskId);
    if (!t?.location) return;

    const next: [number, number] = [t.location.lat, t.location.lng];

    const raf = requestAnimationFrame(() => {
      setCenter(next);
    });

    return () => cancelAnimationFrame(raf);
  }, [selectedTaskId, tasks]);

  const reverseGeocodeLabel = async (lat: number, lng: number) => {
    // fallback: 座標
    let label = `(${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data: unknown = await res.json();

      if (
        typeof data === "object" &&
        data !== null &&
        "ok" in data &&
        "label" in data
      ) {
        const d = data as { ok?: boolean; label?: string };
        if (d.ok && d.label) label = String(d.label);
      }
    } catch {
      // ignore
    }

    return label;
  };

  const pickLocation = async (lat: number, lng: number) => {
    const label = await reverseGeocodeLabel(lat, lng);

    // ✅ Map上の表示用
    setLastPicked({ lat, lng, label });

    // ✅ TODO追加欄へリアルタイム反映（store）
    setPickedLocation({ lat, lng, label });

    // ✅ 選択中タスクがあれば場所を紐付け（updateTaskで更新）
    if (selectedTaskId) {
      updateTask(selectedTaskId, {
        location: { lat, lng, label },
      });
    }
  };

  const goMyLocation = () => {
    if (!navigator.geolocation) {
      alert("このブラウザは位置情報に対応していません");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setMyPos({ lat, lng });
        setCenter([lat, lng]);
      },
      () => {
        alert("位置情報を取得できませんでした（許可が必要です）");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };



  return (
    <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">Map</div>

        <button
          onClick={goMyLocation}
          className="rounded-xl bg-zinc-900 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          現在地へ
        </button>
      </div>

      <div className="mb-2 text-xs text-zinc-400">
        地図クリックでピン → 選択中TODOに場所反映（左のTODO or カレンダーをクリックして選択）
      </div>

      {/* ✅ pickedLocation表示 */}
      <div className="mb-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200">
        <div className="mb-1 opacity-70">直近で選択した場所</div>
        <div className="font-semibold">
          {pickedLocation?.label ?? "（未選択）"}
        </div>
      </div>

      <div className="h-[calc(100%-120px)] overflow-hidden rounded-2xl">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
        >
          <Recenter center={center} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onPick={pickLocation} />

          {/* ✅ 現在地ピン */}
          {myPos && (
            <Marker position={[myPos.lat, myPos.lng]} icon={DEFAULT_ICON}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">現在地</div>
                  <div>
                    ({myPos.lat.toFixed(5)}, {myPos.lng.toFixed(5)})
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ✅ クリックした場所 */}
          {lastPicked && (
            <Marker
              position={[lastPicked.lat, lastPicked.lng]}
              icon={DEFAULT_ICON}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">選択中</div>
                  <div>{lastPicked.label}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ✅ タスクに紐づいた場所 */}
          {tasksWithLoc.map((t) => (
            <Marker
              key={t.id}
              position={[t.location!.lat, t.location!.lng]}
              icon={DEFAULT_ICON}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{t.title}</div>
                  <div>{t.location!.label}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}