"use client";

import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 2200);
  },
  hide: () => set({ message: null }),
}));

export const toast = (message: string) => useToast.getState().show(message);

export function ToastHost() {
  const message = useToast((s) => s.message);
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className="toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
