"use client";

import { supabase } from "./supabase";

export interface ReminderRow {
  id: string;
  endpoint: string;
  hour: number;
  tz: string;
  enabled: boolean;
}

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const vapidKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Der VAPID-Schlüssel kommt als base64url, applicationServerKey will Bytes. */
function toUint8(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  /* Der Puffer wird ausdruecklich als ArrayBuffer angelegt: applicationServerKey
     akzeptiert keinen SharedArrayBuffer, und genau den laesst der weite
     Standardtyp Uint8Array zu. */
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const need = () => {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  return supabase;
};

/** Das Abo dieses Geräts, falls eines besteht. */
export async function currentSubscription(userId: string): Promise<ReminderRow | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;

  const { data, error } = await need()
    .from("push_subscriptions")
    .select("id, endpoint, hour, tz, enabled")
    .eq("user_id", userId)
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  if (error) throw error;
  return (data as ReminderRow) ?? null;
}

/** Fragt die Erlaubnis, abonniert und hinterlegt das Gerät.
 *
 *  Die Erlaubnisfrage muss aus einer Nutzergeste kommen — Chrome und Safari
 *  lehnen sie sonst ohne Rückfrage ab.
 */
export async function enableReminders(userId: string, hour: number): Promise<ReminderRow> {
  if (!pushSupported()) throw new Error("Dieser Browser kann keine Erinnerungen.");
  if (!vapidKey()) throw new Error("Der Push-Schlüssel fehlt in der Konfiguration.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Benachrichtigungen sind für diese Seite blockiert — das lässt sich nur in den Browser-Einstellungen zurücknehmen."
        : "Ohne Erlaubnis keine Erinnerung.",
    );
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8(vapidKey()),
    }));

  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) throw new Error("Das Abo kam unvollständig zurück.");

  const row = {
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Vienna",
    hour,
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await need()
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select("id, endpoint, hour, tz, enabled")
    .single();
  if (error) throw error;
  return data as ReminderRow;
}

export async function setReminderHour(id: string, hour: number): Promise<void> {
  const { error } = await need()
    .from("push_subscriptions")
    .update({ hour, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Meldet dieses Gerät ab — im Browser und in der Datenbank. */
export async function disableReminders(id: string): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => undefined);

  const { error } = await need().from("push_subscriptions").delete().eq("id", id);
  if (error) throw error;
}

/** Zeigt sofort eine Benachrichtigung über den Service Worker — prüft die
 *  Anzeige, nicht den Weg über den Push-Dienst. */
export async function testNotification(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("Vier Säulen", {
    body: "So sieht die Erinnerung aus.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "test",
  });
}
