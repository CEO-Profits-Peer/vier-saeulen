/* Erzeugt die VAPID-Schlüssel und das Cron-Secret und schreibt sie in
 * .env.local. Der private Schlüssel und das Secret werden bewusst nie
 * ausgegeben — nur der öffentliche Schlüssel, der ohnehin im Browser landet.
 *
 *   node scripts/gen-push-keys.mjs
 *
 * Vorhandene Werte bleiben stehen; --force überschreibt sie.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import webpush from "web-push";

const FILE = ".env.local";
const force = process.argv.includes("--force");

const existing = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
const has = (key) => new RegExp(`^${key}=`, "m").test(existing);

if (!force && has("VAPID_PRIVATE_KEY")) {
  const pub = existing.match(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=(.*)$/m)?.[1] ?? "(fehlt)";
  console.log("Schlüssel existieren bereits — nichts geändert.");
  console.log("Öffentlicher Schlüssel:", pub);
  console.log("Zum Neuerzeugen: node scripts/gen-push-keys.mjs --force");
  process.exit(0);
}

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const cronSecret = randomBytes(32).toString("base64url");

/* Alte Zeilen entfernen, damit --force nicht dupliziert. */
const keep = existing
  .split("\n")
  .filter(
    (l) =>
      !/^(NEXT_PUBLIC_VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|VAPID_SUBJECT|CRON_SECRET)=/.test(l),
  )
  .join("\n")
  .replace(/\n+$/, "");

const block = [
  "",
  "# Web Push. Der öffentliche Schlüssel darf in den Browser, die anderen drei",
  "# gehören ausschließlich auf den Server.",
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`,
  `VAPID_PRIVATE_KEY=${privateKey}`,
  "VAPID_SUBJECT=mailto:nexusnode.contact@gmail.com",
  `CRON_SECRET=${cronSecret}`,
  "",
].join("\n");

writeFileSync(FILE, keep + "\n" + block, "utf8");

console.log("Geschrieben nach .env.local:");
console.log("  NEXT_PUBLIC_VAPID_PUBLIC_KEY =", publicKey);
console.log("  VAPID_PRIVATE_KEY            = (gesetzt, nicht ausgegeben)");
console.log("  VAPID_SUBJECT                = mailto:nexusnode.contact@gmail.com");
console.log("  CRON_SECRET                  = (gesetzt, nicht ausgegeben)");
