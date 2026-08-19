"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Ring({
  pct,
  color,
  size = 56,
  stroke = 6,
  track = "var(--fill)",
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  track?: string;
  children?: ReactNode;
}) {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
      ) : null}
    </div>
  );
}
