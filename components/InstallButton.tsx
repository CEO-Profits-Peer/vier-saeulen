"use client";

import { useInstall, isIOS } from "@/lib/install";
import { haptic } from "@/lib/haptics";
import { toast } from "./Toast";

/** „Als App benutzen“ — löst auf Android die echte Installation aus.
 *
 *  Chrome verlangt, dass prompt() aus einer Nutzergeste heraus aufgerufen wird,
 *  und lässt genau einen Aufruf je Ereignis zu. Danach ist das Ereignis
 *  verbraucht: entweder ist die App installiert oder es kommt später neu.
 */
export function InstallButton({ wide = true }: { wide?: boolean }) {
  const prompt = useInstall((s) => s.prompt);
  const standalone = useInstall((s) => s.standalone);
  const justInstalled = useInstall((s) => s.justInstalled);
  const setPrompt = useInstall((s) => s.setPrompt);
  const setJustInstalled = useInstall((s) => s.setJustInstalled);

  /* Läuft schon als App — dann gibt es nichts zu installieren. */
  if (standalone || justInstalled) {
    return (
      <p style={{ margin: 0, fontSize: 15, color: "var(--label-2)" }}>
        Läuft als App. ✓
      </p>
    );
  }

  if (!prompt) {
    /* iOS kennt kein beforeinstallprompt, Safari verlangt den Umweg über Teilen. */
    return (
      <p style={{ margin: 0, fontSize: 15 }}>
        {isIOS() ? (
          <>
            <b>Auf den Homescreen:</b> in Safari unten auf <b>Teilen</b> → <b>Zum Home-Bildschirm</b>.
          </>
        ) : (
          <>
            <b>Auf den Homescreen:</b> Chrome oder Samsung Internet → Menü <b>⋮</b> → <b>App installieren</b>.
            Der Knopf hier erscheint, sobald der Browser die App als installierbar meldet — meist nach dem
            zweiten Besuch.
          </>
        )}
      </p>
    );
  }

  return (
    <button
      className={`btn filled${wide ? " wide" : ""}`}
      onClick={async () => {
        haptic("tap");
        try {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === "accepted") {
            setJustInstalled(true);
            toast("Installiert — schau auf deinen Homescreen");
          } else {
            /* Verbraucht: Chrome gibt dasselbe Ereignis nicht erneut heraus. */
            setPrompt(null);
            toast("Abgebrochen — geht später über das Browser-Menü");
          }
        } catch {
          setPrompt(null);
          toast("Hat nicht geklappt — probier das Browser-Menü");
        }
      }}
    >
      Als App benutzen
    </button>
  );
}
