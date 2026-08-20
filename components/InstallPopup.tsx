"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { isIOS, useInstall } from "@/lib/install";
import { useStore } from "@/lib/store";

const KEY = "viersaeulen.installhint";
/* Zwei Wochen Ruhe nach dem Wegtippen. Ein Hinweis, der jeden Tag wiederkommt,
   ist keine Empfehlung mehr, sondern eine Belästigung. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/* Erst nach ein paar Sekunden — wer gerade ankommt, will die App sehen,
   nicht eine Aufforderung. */
const DELAY_MS = 9000;

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(KEY) ?? 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* Privater Modus — dann eben nur für diese Sitzung. */
  }
}

/** Bietet die Installation an, solange die App im Browser läuft.
 *
 *  Erscheint nur, wenn sie auch etwas bewirkt: entweder hat Chrome ein
 *  Installationsangebot hinterlegt, oder es ist ein iPhone, wo der Weg über
 *  Teilen führt. Auf allen anderen Kombinationen bliebe ein Hinweis wirkungslos.
 */
export function InstallPopup() {
  const prompt = useInstall((s) => s.prompt);
  const standalone = useInstall((s) => s.standalone);
  const justInstalled = useInstall((s) => s.justInstalled);
  const setPrompt = useInstall((s) => s.setPrompt);
  const setJustInstalled = useInstall((s) => s.setJustInstalled);
  const runActive = useStore((s) => Boolean(s.run));

  const [ripe, setRipe] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (snoozed()) {
      setGone(true);
      return;
    }
    const t = setTimeout(() => setRipe(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const ios = isIOS();
  const useful = Boolean(prompt) || ios;
  const show = ripe && !gone && !standalone && !justInstalled && useful;

  const dismiss = () => {
    snooze();
    setGone(true);
    haptic("tap");
  };

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className={runActive ? "installpop with-run" : "installpop"}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          role="dialog"
          aria-label="Als App installieren"
        >
          <div className="installpop-body">
            <span className="installpop-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M12 6v7M9 10.5l3 3 3-3" />
              </svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="installpop-title">Als App benutzen</div>
              <div className="installpop-sub">
                {ios && !prompt
                  ? "Teilen → Zum Home-Bildschirm. Läuft danach ohne Browserleiste."
                  : "Eigenes Icon, keine Browserleiste, funktioniert ohne Netz."}
              </div>
            </div>
          </div>

          <div className="installpop-actions">
            <button className="btn plain" onClick={dismiss}>Später</button>
            {prompt ? (
              <button
                className="btn filled"
                onClick={async () => {
                  haptic("tap");
                  try {
                    await prompt.prompt();
                    const { outcome } = await prompt.userChoice;
                    if (outcome === "accepted") {
                      setJustInstalled(true);
                      toast("Installiert — schau auf deinen Homescreen");
                    } else {
                      setPrompt(null);
                      snooze();
                    }
                  } catch {
                    setPrompt(null);
                  }
                  setGone(true);
                }}
              >
                Installieren
              </button>
            ) : (
              <button className="btn filled" onClick={dismiss}>Verstanden</button>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
