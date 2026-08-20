"use client";

import { DEFAULT_SIGIL, PILLARS, type Pillar, type Profile, type Sigil } from "@/lib/types";

/* Vier Balken, zwei links und zwei rechts der Mitte. Breite und Abstand sind
   fest, damit das Zeichen in jeder Größe gleich proportioniert bleibt. */
const BAR_W = 10;
const GAP = 3;
const SPAN = BAR_W * 4 + GAP * 3;
const X0 = (100 - SPAN) / 2;
export const BAR_X = [0, 1, 2, 3].map((i) => X0 + i * (BAR_W + GAP));

export const sigilOf = (p?: Profile): Sigil => p?.sigil ?? DEFAULT_SIGIL;

/** Das eigene Zeichen: vier Säulen in einem Kreis.
 *
 *  Die Balken wachsen aus der Mitte nach oben und unten — dadurch bleibt das
 *  Zeichen symmetrisch, egal wie unterschiedlich die Höhen sind. Der Kreis
 *  schneidet sie ab, statt sie zu begrenzen: so darf eine Säule den Rand
 *  berühren, ohne dass die Form ausbricht.
 */
export function SigilMark({ sigil, size = 56 }: { sigil: Sigil; size?: number }) {
  const id = `sig-${sigil.bars.map((b) => `${Math.round(b.h)}${b.c.replace("#", "")}`).join("")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden role="presentation">
      <defs>
        <clipPath id={id}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="var(--fill)" />
      <g clipPath={`url(#${id})`}>
        {sigil.bars.map((bar, i) => {
          const h = Math.max(6, Math.min(100, bar.h));
          return (
            <rect
              key={i}
              x={BAR_X[i]}
              y={50 - h / 2}
              width={BAR_W}
              height={h}
              rx={BAR_W / 2}
              fill={bar.c}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** Zeigt, was im Profil gewählt ist — Zeichen, Emoji oder Anfangsbuchstabe. */
export function Avatar({
  profile,
  fallback,
  size = 56,
}: {
  profile?: Profile;
  /** Woraus der Buchstabe kommt, wenn nichts gewählt ist */
  fallback?: string;
  size?: number;
}) {
  const kind = profile?.avatar ?? (profile?.emoji ? "emoji" : "letter");
  const accent: Pillar = profile?.accent ?? "learn";

  if (kind === "sigil") {
    return (
      <span
        style={{ width: size, height: size, flex: "none", display: "grid", placeItems: "center" }}
      >
        <SigilMark sigil={sigilOf(profile)} size={size} />
      </span>
    );
  }

  const letter = (profile?.name || fallback || "?").trim().slice(0, 1).toUpperCase();

  return (
    <span
      className={PILLARS[accent].cls}
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        background: "var(--p)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: kind === "emoji" ? size * 0.5 : size * 0.4,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,.4), 0 4px 14px -6px var(--p)",
      }}
    >
      {kind === "emoji" ? profile?.emoji : letter}
    </span>
  );
}
