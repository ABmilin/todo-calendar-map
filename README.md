# TODO × Calendar × Map

タスクを「いつ（カレンダー）・どこで（地図）・なにをするか（TODO）」まで一画面で整理できる、就活ポートフォリオ用のWebアプリです。

## Demo
- URL: <デプロイURLをここに>
- Repo: <GitHubリポジトリURLをここに>

---

## How to Use（使い方）

1. 左のフォームでタスクを追加します（期限・所要時間・メモも任意で入力）
2. 「未スケジュール」のタスクを、カレンダーへドラッグして予定化します
3. TODO（またはカレンダー）でタスクを選択し、地図をクリックすると場所が紐づきます  
   ※「現在地へ」ボタンで現在地表示もできます（ブラウザの許可が必要）

### Calendar 操作
- 通常クリック：編集対象として選択
- Ctrl(⌘) + クリック：完了/未完了の切替
- Alt + クリック：削除

---

## Tech Stack
- Next.js (App Router) / TypeScript
- Zustand（状態管理）
- FullCalendar（ドラッグ&ドロップ予定管理）
- Leaflet + react-leaflet（地図表示）
- Tailwind CSS

---

## Privacy
- 位置情報はブラウザの許可が必要です。
- 本アプリはタスクを localStorage に保存します（サーバへ保存しません）。
- 位置情報やタスク内容をサーバへ保存しない設計です（逆ジオコーディング時の外部API呼び出しを除く）。

---

## Third-party Services / Notes（重要）

### OpenStreetMap Tiles
地図タイルは OpenStreetMap の公開タイルサーバを使用しています。
このタイルは **best-effort（SLAなし）** であり、アクセスが集中するなど「重い利用」ではブロックされる可能性があります。
ポートフォリオ用途の少量アクセスを想定しています。

### Reverse Geocoding (Nominatim)
地図クリック時の場所名取得に Nominatim（OpenStreetMap）を利用しています。
リクエストはレート制限・識別可能なUser-Agentを付与し、キャッシュを入れています。
大量アクセスが発生する用途では、専用プロバイダや自前運用等への切替が必要です。

---

## Setup（ローカル実行）
```bash
npm install
npm run dev