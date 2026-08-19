"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNet } from "@/lib/net";
import { useStore } from "@/lib/store";

/** Zwei kleine Leisten über der Tab-Bar:
 *  – "offline", solange kein Netz anliegt
 *  – "neue Version", sobald ein Service Worker wartet
 *
 *  Der neue Worker übernimmt bewusst nicht von selbst: die laufende Seite
 *  hat Chunks des alten Builds geladen. Erst auf Tippen wird gewechselt und
 *  neu geladen — sonst gäbe es mitten in der Sitzung fehlende Module.
 */
export function UpdatePrompt() {
  const online = useNet((s) => s.online);
  /* Laeuft eine Sequenz, sitzt die RunBar auf derselben Hoehe — dann eine
     Etage hoeher, sonst liegen beide uebereinander. */
  const runActive = useStore((s) => Boolean(s.run));
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          /* installed + vorhandener Controller = echtes Update, keine
             Erstinstallation */
          if (next.state === "installed" && navigator.serviceWorker.controller) setWaiting(next);
        });
      });
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const show = !online || waiting;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className={runActive ? "netbar with-run" : "netbar"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          role="status"
          aria-live="polite"
        >
          {!online ? (
            <span className="netbar-text">
              <i className="netbar-dot" />
              Offline — alles läuft weiter, Sync holt nach
            </span>
          ) : (
            <button
              className="netbar-action"
              onClick={() => {
                waiting?.postMessage("SKIP_WAITING");
                setWaiting(null);
              }}
            >
              <span className="netbar-text">Neue Version bereit</span>
              <span className="netbar-cta">Neu laden</span>
            </button>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
