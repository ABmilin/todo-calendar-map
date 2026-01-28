# TODO × Calendar × Map

タスクを **「いつ（カレンダー）・どこで（地図）・なにをする（TODO）」** まで、1画面で整理できる Web アプリです。  
就活ポートフォリオとして「状態管理」「ドラッグ&ドロップ」「地図連携」「APIルート」をまとめて実装しました。

---

## Demo / Repository

- Demo: `https://todo-calendar-map.vercel.app`
- Repository: `https://github.com/ABmilin/todo-calendar-map`

---

## Features

- ✅ タスク追加（タイトル / 期限 / 所要時間 / メモ / 場所）
- ✅ 未予定タスクをカレンダーへドラッグして予定化（FullCalendar）
- ✅ カレンダー上のドラッグ移動・伸縮で時間調整
- ✅ 地図クリックで場所選択 → 選択中タスクに場所を紐づけ（Leaflet）
- ✅ 期限の見える化（※月表示：期限ラベル表示＆ドラッグで期限変更）
- ✅ データはブラウザ内に保存（localStorage）

---

## How to Use（使い方）

1. 左のフォームでタスクを追加します（期限・所要時間・メモは任意）
2. 「未スケジュール」のタスクを **カレンダーへドラッグ**して予定化します
3. TODO（またはカレンダー）でタスクを選択し、**地図をクリック**すると場所が紐づきます  
   ※「現在地へ」ボタンで現在地表示もできます（ブラウザの許可が必要）

### Calendar 操作
- 通常クリック：編集対象として選択
- Ctrl(⌘) + クリック：完了 / 未完了の切替
- Alt + クリック：削除（確認ダイアログあり）

---

## Tech Stack

- Next.js (App Router) / TypeScript
- Zustand（状態管理 + localStorage 永続化）
- FullCalendar（ドラッグ&ドロップ予定管理）
- Leaflet + react-leaflet（地図表示）
- Tailwind CSS

---

## Project Structure（ざっくり）

- `src/components/TaskList.tsx`  
  タスク追加・編集、未予定一覧、外部ドラッグ（→カレンダー）
- `src/components/CalendarView.tsx`  
  FullCalendar表示、予定化・移動・伸縮、期限表示（→期限ラベル）
- `src/components/MapInner.tsx`  
  地図表示、クリックで座標取得、逆ジオコーディング呼び出し、タスクへ紐づけ
- `src/app/api/reverse-geocode/route.ts`  
  Nominatim（OpenStreetMap）の Reverse Geocoding を呼ぶ API ルート

---

## Privacy / Data Handling（プライバシー）

- 位置情報は **ブラウザの許可**が必要です。
- タスクは **localStorage に保存**されます（サーバDBには保存しません）。
- 位置情報やタスク内容をサーバへ保存しない設計です。  
  ただし、場所名取得のために Reverse Geocoding を外部サービスへ問い合わせます（下記参照）。

> 補足：localStorage は「その端末・そのブラウザ」に保存されます。  
> 別の人の端末にタスクが見えることは基本ありませんが、同じPC/同じブラウザを複数人で共有すると履歴が残る可能性があります。

---

## Third-party Services / Notes（重要）

### OpenStreetMap Tiles
地図タイルは OpenStreetMap の公開タイルサーバを利用しています。  
公開タイルは **best-effort（SLAなし）** のため、アクセスが集中するような「重い利用」では制限される可能性があります。  
本プロジェクトはポートフォリオ用途の少量アクセスを想定しています。

### Reverse Geocoding (Nominatim)
地図クリック時の場所名取得に Nominatim（OpenStreetMap）を利用しています。

- 識別可能な `User-Agent` を付与
- 連続アクセスを避けるための簡易スロットルを実装

大量アクセスが想定される用途では、専用プロバイダ利用や自前運用等への切り替えが必要です。

---

## Setup（ローカル実行）

```bash
npm install
npm run dev