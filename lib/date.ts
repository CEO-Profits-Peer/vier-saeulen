const pad = (n: number) => String(n).padStart(2, "0");

export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dkey(new Date());
export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
export function isoWeek(d: Date) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const y0 = new Date(t.getFullYear(), 0, 1);
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getFullYear()}-W${pad(w)}`;
}
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const fmtLong = (d: Date) => d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
export const fmtShort = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
export const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${pad(s)}`;
};
export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 12);
