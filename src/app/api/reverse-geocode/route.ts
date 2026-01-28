import { NextResponse } from "next/server";

let lastCallAt = 0;

// ✅ 超軽量メモリキャッシュ（同一座標の連打を吸収）
// Note: サーバレス環境ではインスタンスごとに別キャッシュになるが、無いよりかなり良い
const cache = new Map<string, { label: string; at: number }>();
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

function keyOf(lat: string, lng: string) {
  // 5桁丸め：キャッシュヒットしやすく（約1m〜数m精度）
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

function fallbackLabel(lat: string, lng: string) {
  return `(${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { ok: false, error: "lat/lng required" },
      { status: 400 }
    );
  }

  // ✅ キャッシュヒット
  const key = keyOf(lat, lng);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ ok: true, label: hit.label });
  }

  // ✅ Nominatimの「最大1 req/sec」対策（開発用スロットル）
  // （ポリシー：absolute maximum of 1 request per second）  [oai_citation:2‡OSMF Operations](https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com)
  const now = Date.now();
  if (now - lastCallAt < 1100) {
    const label = fallbackLabel(lat, lng);
    return NextResponse.json({ ok: true, label });
  }
  lastCallAt = now;

  // ✅ 識別できるUser-Agent（stock UAは不可）  [oai_citation:3‡OSMF Operations](https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com)
  // ※ <you>/<repo> と連絡先はあなたのものに置き換えて
  const UA =
    "todo-calendar-map/1.0 (https://github.com/<you>/<repo>; contact: <mail>)";

  try {
    const api = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(api, {
      headers: {
        "User-Agent": UA,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const label = fallbackLabel(lat, lng);
      return NextResponse.json({ ok: true, label });
    }

    const data = await res.json();
    const name =
      data?.name ||
      data?.display_name?.split(",")?.slice(0, 2)?.join(",") ||
      fallbackLabel(lat, lng);

    // ✅ 成功時キャッシュ
    cache.set(key, { label: String(name), at: Date.now() });

    return NextResponse.json({ ok: true, label: String(name) });
  } catch {
    const label = fallbackLabel(lat, lng);
    return NextResponse.json({ ok: true, label });
  }
}