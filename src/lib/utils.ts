export const nowIso = () => new Date().toISOString();

export const isOverdue = (dueAt?: string, done?: boolean) => {
  if (!dueAt) return false;
  if (done) return false;
  return new Date(dueAt).getTime() < Date.now();
};

export const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
};

export const formatTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const addMinutes = (iso: string, minutes: number) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
};