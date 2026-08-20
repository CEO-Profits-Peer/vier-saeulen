"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/auth";
import { useInstall } from "@/lib/install";
import { netMessage } from "@/lib/net";
import {
  currentSubscription,
  disableReminders,
  enableReminders,
  pushSupported,
  setReminderHour,
  testNotification,
  vapidKey,
  type ReminderRow,
} from "@/lib/reminders";

const HOURS = [18, 19, 20, 21, 22];

export function Reminders() {
  const user = useAuth((s) => s.user);
  const standalone = useInstall((s) => s.standalone);
  const [row, setRow] = useState<ReminderRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoaded(true);
      return;
    }
    try {
      setRow(await currentSubscription(user.id));
    } catch {
      /* Tabelle fehlt oder offline — der Abschnitt bleibt einfach aus. */
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!pushSupported()) {
    return (
      <div className="card">
        <p style={{ margin: 0, fontSize: 15, color: "var(--label-2)" }}>
          Dieser Browser unterstützt keine Erinnerungen. Auf dem iPhone geht es nur, wenn die App über
          <b> Teilen → Zum Home-Bildschirm</b> installiert wurde.
        </p>
      </div>
    );
  }

  if (!vapidKey()) {
    return (
      <div className="card">
        <p style={{ margin: 0, fontSize: 15, color: "var(--label-2)" }}>
          Erinnerungen sind nicht eingerichtet — <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> fehlt.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card">
        <p style={{ margin: 0, fontSize: 15, color: "var(--label-2)" }}>
          Erinnerungen brauchen ein Konto — der Server muss wissen, wohin er sie schicken soll.
        </p>
      </div>
    );
  }

  const on = Boolean(row?.enabled);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Abend-Erinnerung</div>
          <div style={{ fontSize: 13, color: "var(--label-2)" }}>
            {!loaded
              ? "Lädt…"
              : on
                ? `Täglich um ${String(row!.hour).padStart(2, "0")}:00 · ${row!.tz}`
                : "Aus — ein Stupser am Abend hält die Serie am Leben"}
          </div>
        </div>
        <button
          className={on ? "btn" : "btn filled"}
          disabled={busy || !loaded}
          onClick={async () => {
            setBusy(true);
            try {
              if (on) {
                await disableReminders(row!.id);
                setRow(null);
                toast("Erinnerungen aus");
              } else {
                const next = await enableReminders(user.id, 21);
                setRow(next);
                haptic("success");
                toast("Erinnerung steht");
              }
            } catch (err) {
              haptic("warn");
              toast(netMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {on ? "Aus" : "An"}
        </button>
      </div>

      {on ? (
        <>
          <p className="field-label" style={{ margin: "16px 4px 8px" }}>Uhrzeit</p>
          <div className="segmented">
            {HOURS.map((h) => (
              <button
                key={h}
                aria-selected={row!.hour === h}
                disabled={busy}
                onClick={async () => {
                  if (row!.hour === h) return;
                  setBusy(true);
                  try {
                    await setReminderHour(row!.id, h);
                    setRow({ ...row!, hour: h });
                    haptic("tap");
                  } catch (err) {
                    toast(netMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {h}:00
              </button>
            ))}
          </div>

          <button
            className="btn plain wide"
            style={{ marginTop: 10 }}
            onClick={() => void testNotification().catch(() => toast("Anzeige hat nicht geklappt"))}
          >
            Testbenachrichtigung anzeigen
          </button>

          <p style={{ fontSize: 13, color: "var(--label-2)", margin: "10px 4px 0" }}>
            Gilt für dieses Gerät. Handy und Laptop lassen sich getrennt einstellen.
            {!standalone ? " Zuverlässiger wird es, wenn die App auf dem Homescreen liegt." : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}
