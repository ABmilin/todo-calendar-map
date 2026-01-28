# TODO × Calendar × Map

タスクを「いつ（カレンダー）・どこで（地図）・なにをするか（TODO）」まで、1画面で整理できるWebアプリです。  
就活ポートフォリオとして、UI/UX・ドラッグ操作・地図連携・状態管理をまとめて実装しました。

## Demo
- URL: https://todo-calendar-map.vercel.app
- Repo: https://github.com/ABmilin/todo-calendar-map

---

## Features（できること）
- タスク追加（期限・所要時間・メモ）
- 未スケジュールタスクを **ドラッグ&ドロップで予定化**
- カレンダーでタスクを選択 → 地図クリックで **場所を紐付け**
- タスクの完了/未完了切替、削除、編集
- localStorage 保存（リロードしても保持）

---

## How to Use（使い方）
1. 左のフォームでタスクを追加します（期限・所要時間・メモは任意）
2. 「未スケジュール」のタスクを、カレンダーへドラッグして予定化します
3. TODO（またはカレンダー）でタスクを選択し、地図をクリックすると場所が紐づきます  
   ※「現在地へ」ボタンで現在地表示もできます（ブラウザの許可が必要）

### Calendar 操作
- 通常クリック：編集対象として選択
- Ctrl(⌘) + クリック：完了/未完了の切替
- Alt + クリック：削除（確認ダイアログあり）

---

## Tech Stack（使用技術）
- Next.js (App Router) / TypeScript
- Zustand（状態管理 / localStorage永続化）
- FullCalendar（ドラッグ&ドロップによる予定管理）
- Leaflet + react-leaflet（地図表示）
- Tailwind CSS（UI）

---

## Implementation Notes（実装のポイント）
- **タスクの状態管理**：ZustandでTask配列を集中管理し、追加/編集/完了/削除/予定化をStore経由で更新
- **ドラッグ予定化**：TaskListで外部ドラッグを生成し、Calendarで受け取って scheduledStart を更新
- **場所名の取得**：地図クリック座標を `/api/reverse-geocode` に送信し、サーバ側でNominatimへ reverse geocoding（場所名取得）
- **データ保存**：タスクは localStorage に保存（サーバにタスク本文を保存しない設計）

---

## Privacy（プライバシー）
- 位置情報はブラウザの許可が必要です（許可しなくてもアプリ自体は利用できます）。
- 本アプリはタスクを localStorage に保存します（サーバへ保存しません）。
- 逆ジオコーディング（場所名取得）のために、座標を外部サービスへ送信します（下記参照）。

---

## Third-party Services / Notes（重要：利用規約・権利）
このアプリは OpenStreetMap の公開リソースを利用します。ポートフォリオ用途の「軽負荷アクセス」を前提としています。

### OpenStreetMap Tiles
地図タイルは `tile.openstreetmap.org`（OpenStreetMap公式の公開タイル）を使用しています。  
公式タイルは **best-effort（SLAなし）** で、重い利用や不適切利用により **予告なくブロックされる可能性**があります。  [oai_citation:4‡OSMFオペレーションズ](https://operations.osmfoundation.org/policies/tiles/?utm_source=chatgpt.com)  
※アクセスが増える用途では、タイルの自前運用や商用タイルプロバイダ利用を検討してください。  [oai_citation:5‡OSMFオペレーションズ](https://operations.osmfoundation.org/policies/tiles/?utm_source=chatgpt.com)

### Reverse Geocoding (Nominatim)
地図クリック時の場所名取得に Nominatim（nominatim.openstreetmap.org）を利用しています。  
Nominatimは利用ポリシー上、以下が必須です：  
- **最大 1 request/sec（アプリ利用者の合計）**  [oai_citation:6‡OSMFオペレーションズ](https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com)  
- **識別できる User-Agent / Referer**（標準UAは不可）  [oai_citation:7‡OSMFオペレーションズ](https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com)  
- **適切な帰属表示**  [oai_citation:8‡OSMFオペレーションズ](https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com)  

本アプリでは `src/app/api/reverse-geocode/route.ts` で簡易スロットル（連続呼び出し抑制）と、識別可能な User-Agent を付与しています。

---

## Setup（ローカル実行）
```bash
npm install
npm run dev