"use client";

import { dayStats } from "./score";
import { fromKey } from "./date";
import { PILLARS, PKEYS, type AppData, type FlowRoutine, type Segment } from "./types";

/* ============================================================
   Tageskarte als Bild
   ============================================================ */

/** Liest eine CSS-Variable aus dem Dokument, damit die Karte in Hell und
 *  Dunkel dieselben Farben trägt wie die App. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const ratio = (a: { done: number; total: number }) => (a.total ? a.done / a.total : 0);

/** Zeichnet die Tageskarte. 1080×1350 ist das Hochformat, das Instagram und
 *  WhatsApp ohne Beschnitt annehmen. */
export function renderDayCard(data: AppData, key: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const s = dayStats(data, key);
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const bg = dark ? "#000000" : "#f2f2f7";
  const card = dark ? "#1c1c1e" : "#ffffff";
  const label = dark ? "#ffffff" : "#000000";
  const label2 = dark ? "rgba(235,235,245,.6)" : "rgba(60,60,67,.6)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Aurora-Andeutung wie in der App */
  const colors = PKEYS.map((p) => cssVar(PILLARS[p].varName, "#007aff"));
  const spots: [number, number, number][] = [
    [W * 0.15, H * 0.12, 420],
    [W * 0.86, H * 0.18, 380],
    [W * 0.82, H * 0.86, 420],
    [W * 0.18, H * 0.8, 380],
  ];
  ctx.globalAlpha = dark ? 0.26 : 0.3;
  spots.forEach(([x, y, r], i) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colors[i]);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  ctx.globalAlpha = 1;

  const pad = 80;
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  /* Karte */
  roundRect(pad, 210, W - pad * 2, 930, 48);
  ctx.fillStyle = card;
  ctx.globalAlpha = dark ? 0.82 : 0.86;
  ctx.fill();
  ctx.globalAlpha = 1;

  /* Kopf */
  const date = fromKey(key);
  ctx.fillStyle = label2;
  ctx.font = "500 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }).toUpperCase(),
    W / 2,
    150,
  );

  /* Großer Ring */
  const cx = W / 2;
  const cy = 500;
  const R = 180;
  const stroke = 34;
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.strokeStyle = dark ? "rgba(120,120,128,.24)" : "rgba(120,120,128,.16)";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  const tint = cssVar("--tint", "#007aff");
  ctx.strokeStyle = tint;
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, s.pct)) / 100);
  ctx.stroke();

  ctx.fillStyle = label;
  ctx.font = "700 132px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(`${s.pct}`, cx, cy + 30);
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = label2;
  ctx.fillText("%", cx, cy + 88);

  /* Vier Säulen als Balken */
  let y = 790;
  for (const p of PKEYS) {
    const pct = Math.round(ratio(s.by[p]) * 100);
    const color = cssVar(PILLARS[p].varName, "#007aff");
    ctx.textAlign = "left";
    ctx.fillStyle = label;
    ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(PILLARS[p].label, pad + 60, y);
    ctx.textAlign = "right";
    ctx.fillStyle = label2;
    ctx.fillText(`${pct} %`, W - pad - 60, y);

    const barY = y + 22;
    const barW = W - pad * 2 - 120;
    roundRect(pad + 60, barY, barW, 18, 9);
    ctx.fillStyle = dark ? "rgba(120,120,128,.24)" : "rgba(120,120,128,.16)";
    ctx.fill();
    if (pct > 0) {
      roundRect(pad + 60, barY, Math.max(18, (barW * pct) / 100), 18, 9);
      ctx.fillStyle = color;
      ctx.fill();
    }
    y += 92;
  }

  /* Fuß */
  ctx.textAlign = "center";
  ctx.fillStyle = label2;
  ctx.font = "500 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const name = data.profile?.name?.trim();
  ctx.fillText(`${s.done} von ${s.total} Punkten${name ? ` · ${name}` : ""}`, W / 2, 1085);
  ctx.fillStyle = tint;
  ctx.font = "700 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Vier Säulen", W / 2, 1245);

  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

export type ShareResult = "shared" | "downloaded" | "cancelled" | "failed";

/** Teilt die Tageskarte. Wo die Web Share API Dateien annimmt, geht sie direkt
 *  in WhatsApp oder Instagram; sonst wird sie heruntergeladen. */
export async function shareDayCard(data: AppData, key: string): Promise<ShareResult> {
  try {
    const blob = await toBlob(renderDayCard(data, key));
    if (!blob) return "failed";
    const file = new File([blob], `vier-saeulen-${key}.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Vier Säulen" });
        return "shared";
      } catch (err) {
        /* Abbruch durch die Person ist kein Fehler. */
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        return "failed";
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/* ============================================================
   Flow-Sequenzen als Link
   ============================================================ */

/** Nur das Nötige — ohne ids, Zeitstempel und Habit-Verknüpfungen, die auf
 *  einem fremden Gerät ohnehin ins Leere zeigen würden. */
interface PackedRoutine {
  n: string;
  e: string;
  s: [string, number, string][];
}

/** base64url, damit der String ohne Escaping in eine URL passt. */
const toB64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromB64Url = (s: string) => {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function encodeRoutine(r: FlowRoutine): string {
  const packed: PackedRoutine = {
    n: r.name,
    e: r.emoji,
    s: r.segments.map((seg) => [seg.label, seg.minutes, seg.pillar]),
  };
  return toB64Url(JSON.stringify(packed));
}

export function routineLink(r: FlowRoutine): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/flow?v=${encodeRoutine(r)}`;
}

/** Gibt null zurück, wenn der Code nicht trägt — ein kaputter Link darf die
 *  Seite nicht mitreißen. */
export function decodeRoutine(code: string): Omit<FlowRoutine, "id" | "updatedAt"> | null {
  try {
    const parsed = JSON.parse(fromB64Url(code)) as PackedRoutine;
    if (!parsed || typeof parsed.n !== "string" || !Array.isArray(parsed.s) || !parsed.s.length) return null;

    const kinds = new Set(["learn", "body", "image", "money", "relax"]);
    const segments: Segment[] = [];
    for (const [labelRaw, minutesRaw, pillarRaw] of parsed.s.slice(0, 24)) {
      const minutes = Math.round(Number(minutesRaw));
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return null;
      if (!kinds.has(String(pillarRaw))) return null;
      segments.push({
        id: Math.random().toString(36).slice(2, 12),
        label: String(labelRaw ?? "").slice(0, 40) || "Block",
        minutes,
        pillar: pillarRaw as Segment["pillar"],
        habitId: null,
      });
    }
    return {
      name: String(parsed.n).slice(0, 40) || "Geteilte Sequenz",
      emoji: String(parsed.e ?? "⚡").slice(0, 4) || "⚡",
      segments,
    };
  } catch {
    return null;
  }
}
