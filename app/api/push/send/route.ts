import { NextResponse } from "next/server";
import webpush from "web-push";

/** Node-Laufzeit ist nötig: web-push signiert mit Krypto, die es in der
 *  Edge-Runtime nicht gibt. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const isSub = (v: unknown): v is Sub => {
  const s = v as Sub;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.p256dh === "string" &&
    typeof s.auth === "string"
  );
};

/** Vergleicht in konstanter Zeit, damit sich das Secret nicht über die
 *  Antwortzeit Zeichen für Zeichen erraten lässt. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com";

  if (!secret || !publicKey || !privateKey) {
    /* Absichtlich ohne Details: die Antwort geht nach außen. */
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const given = request.headers.get("x-cron-secret") ?? "";
  if (!safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const raw = (body as { subs?: unknown })?.subs;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "subs missing" }, { status: 400 });
  }
  const subs = raw.filter(isSub).slice(0, 500);

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: "Vier Säulen",
    body: "Tag abschließen — Check-in offen.",
    url: "/?checkin=1",
    tag: "daily-checkin",
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 6 * 60 * 60 },
      ),
    ),
  );

  let sent = 0;
  /* 404 und 410 heißen: das Gerät gibt es nicht mehr. Die Ids meldet die
     Antwort zurück, damit sich die Zeilen aufräumen lassen. */
  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent++;
      return;
    }
    const code = (r.reason as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) gone.push(subs[i].id);
  });

  return NextResponse.json({ sent, failed: results.length - sent, gone });
}
