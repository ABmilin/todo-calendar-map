export type TaskStatus = "todo" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;

  // optional
  dueAt?: string; // ISO
  scheduledStart?: string; // ISO
  durationMin: number;

  memo?: string;

  location?: {
    lat: number;
    lng: number;
    label: string; // 表示名（例：図書館 / 緯度経度）
  };
};