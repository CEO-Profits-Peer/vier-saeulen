"use client";

type Pattern = "tap" | "success" | "warn" | "transition";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 12,
  success: [14, 40, 24],
  warn: [30, 60, 30],
  transition: [22, 70, 22, 70, 40],
};

/** Auf Android (Samsung/Chrome) echtes Feedback, auf iOS still ignoriert. */
export function haptic(kind: Pattern = "tap") {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* Vibration nicht verfügbar — kein Grund, irgendetwas abzubrechen */
  }
}
