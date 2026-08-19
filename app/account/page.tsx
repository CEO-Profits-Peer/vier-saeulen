"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import {
  useAuth,
  sendPasswordReset,
  signIn,
  signOut,
  signUp,
  updateEmail,
  updatePassword,
} from "@/lib/auth";
import { useNet, netMessage } from "@/lib/net";
import { cloudEnabled } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { deleteRemote } from "@/lib/sync";
import { dayStats } from "@/lib/score";
import { DAY_ABBR, PILLARS, PKEYS, type AppData, type Pillar } from "@/lib/types";
import { fromKey, todayKey } from "@/lib/date";

export default function AccountPage() {
  return (
    <Hydrated>
      <Account />
    </Hydrated>
  );
}

const AVATARS = ["🎯", "🔥", "⚡", "🌱", "🧠", "💪", "📈", "🦊", "🐺", "🌙", "☕", "🎧"];

function csvFrom(data: AppData) {
  const head = [
    "datum", "wochentag", "score_prozent", "punkte_erreicht", "punkte_geplant",
    "learn_prozent", "body_prozent", "image_prozent", "money_prozent",
    "energie", "fokus", "schlaf_h", "screen_h", "flow_minuten", "win", "notiz",
  ];
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = Object.keys(data.days).sort().map((k) => {
    const s = dayStats(data, k);
    const ci = data.days[k].checkin ?? {};
    const flow = Object.values(data.days[k].flow ?? {}).reduce((a, m) => a + (m ?? 0), 0);
    const pp = (p: Pillar) => (s.by[p].total ? Math.round((s.by[p].done / s.by[p].total) * 100) : "");
    return [
      k, DAY_ABBR[fromKey(k).getDay()], s.pct, s.done, s.total,
      pp("learn"), pp("body"), pp("image"), pp("money"),
      ci.energy ?? "", ci.focus ?? "", ci.sleep ?? "", ci.screen ?? "", flow, ci.win ?? "", ci.note ?? "",
    ].map(q).join(";");
  });
  return [head.join(";"), ...rows].join("\r\n");
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================================================
   Profil — liegt in AppData und synct damit über denselben Blob
   wie alles andere. Kein zusätzliches Schema, keine zweite Tabelle.
   ============================================================ */
function ProfileCard() {
  const profile = useStore((s) => s.data.profile);
  const setProfile = useStore((s) => s.setProfile);
  const data = useStore((s) => s.data);
  const user = useAuth((s) => s.user);

  const [pickerOpen, setPickerOpen] = useState(false);

  const dayCount = Object.keys(data.days).length;
  const accent = profile?.accent ?? "learn";
  const fallback = (profile?.name ?? user?.email ?? "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className={`card ${PILLARS[accent].cls}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => { setPickerOpen((v) => !v); haptic("tap"); }}
          aria-label="Avatar ändern"
          aria-expanded={pickerOpen}
          style={{
            width: 56, height: 56, borderRadius: "50%", flex: "none",
            background: "var(--p)", color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: profile?.emoji ? 27 : 22, fontWeight: 700,
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,.4), 0 4px 14px -6px var(--p)",
          }}
        >
          {profile?.emoji || fallback}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="field"
            style={{ marginBottom: 4, fontWeight: 600, fontSize: 17 }}
            value={profile?.name ?? ""}
            maxLength={40}
            placeholder="Dein Name"
            aria-label="Anzeigename"
            onChange={(e) => setProfile({ name: e.target.value })}
          />
          <div style={{ fontSize: 13, color: "var(--label-2)", paddingLeft: 4 }}>
            {dayCount} {dayCount === 1 ? "Tag" : "Tage"}
            {profile?.since ? ` · dabei seit ${profile.since}` : ""}
          </div>
        </div>
      </div>

      {pickerOpen ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              className="chip"
              aria-pressed={profile?.emoji === emoji}
              style={{ fontSize: 20, minHeight: 42, padding: "6px 12px" }}
              onClick={() => { setProfile({ emoji }); haptic("tap"); }}
            >
              {emoji}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => { setProfile({ emoji: "" }); haptic("tap"); }}
            aria-pressed={!profile?.emoji}
          >
            Buchstabe
          </button>
        </div>
      ) : null}

      <p className="field-label" style={{ margin: "16px 4px 8px" }}>Akzentfarbe</p>
      <div style={{ display: "flex", gap: 8 }}>
        {PKEYS.map((p) => (
          <button
            key={p}
            onClick={() => { setProfile({ accent: p }); haptic("tap"); }}
            aria-label={PILLARS[p].label}
            aria-pressed={accent === p}
            className={PILLARS[p].cls}
            style={{
              flex: 1, height: 36, borderRadius: 10,
              background: "var(--p)",
              boxShadow: accent === p
                ? "inset 0 0 0 2px var(--bg), inset 0 0 0 4px var(--p)"
                : "inset 0 1px 0 0 rgba(255,255,255,.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Sync-Status — zeigt endlich an, was wirklich passiert
   ============================================================ */
function SyncRow() {
  const online = useNet((s) => s.online);
  const sync = useNet((s) => s.sync);
  const lastError = useNet((s) => s.lastError);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);

  const label = !online
    ? "Offline — Änderungen gehen mit, sobald Netz da ist"
    : sync === "syncing"
      ? "Synchronisiert…"
      : sync === "error"
        ? lastError ?? "Sync fehlgeschlagen"
        : lastSyncedAt
          ? `Zuletzt gesynct ${new Date(lastSyncedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
          : "Noch nicht gesynct";

  const tone = !online ? "warn" : sync === "error" ? "bad" : sync === "ok" || lastSyncedAt ? "good" : "";

  return (
    <div style={{ fontSize: 13, color: "var(--label-2)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
      <span className={`badge ${tone}`} style={{ padding: "2px 8px", fontSize: 11 }}>
        {!online ? "offline" : sync === "syncing" ? "läuft" : sync === "error" ? "Fehler" : "ok"}
      </span>
      <span style={{ minWidth: 0 }}>{label}</span>
    </div>
  );
}

function Account() {
  const data = useStore((s) => s.data);
  const setData = useStore((s) => s.setData);
  const resetAll = useStore((s) => s.resetAll);
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const online = useNet((s) => s.online);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmCloud, setConfirmCloud] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [openPanel, setOpenPanel] = useState<"password" | "email" | null>(null);
  const [recovery, setRecovery] = useState(false);

  const dayCount = Object.keys(data.days).length;

  /* Aus einer Zurücksetzen-Mail kommt man mit type=recovery im Fragment an.
     Supabase löst den Token selbst ein — wir müssen nur das Feld aufklappen. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setRecovery(true);
      setOpenPanel("password");
    }
  }, []);

  const guard = async (fn: () => Promise<void>, ok: string) => {
    if (!online) return toast("Dafür braucht es eine Verbindung");
    setBusy(true);
    try {
      await fn();
      haptic("success");
      toast(ok);
    } catch (err) {
      haptic("warn");
      toast(netMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    guard(async () => {
      if (!email.trim() || !password) throw new Error("E-Mail und Passwort ausfüllen");
      if (mode === "signup") await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      setPassword("");
    }, mode === "signup" ? "Konto erstellt — falls nötig, bestätige die Mail" : "Angemeldet");

  const runImport = () => {
    let parsed: AppData;
    try {
      parsed = JSON.parse(importText);
    } catch {
      return toast("Das ist kein gültiges Backup (JSON kaputt)");
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.habits)) {
      return toast("Das sieht nicht nach einem Vier-Säulen-Backup aus");
    }
    setData({ ...parsed, updatedAt: Date.now() });
    setImportText("");
    haptic("success");
    toast("Backup eingespielt");
  };

  return (
    <>
      <Nav
        title="Konto"
        subtitle={`${dayCount} getrackte Tage · Stand ${todayKey()}`}
        right={<Link href="/" className="badge">Fertig</Link>}
      />

      <p className="section-title">Profil</p>
      <ProfileCard />

      <p className="section-title">Sync</p>
      {!cloudEnabled ? (
        <div className="card">
          <p style={{ margin: 0, fontSize: 15 }}>
            Cloud ist für diese Installation nicht eingerichtet. Die App läuft komplett lokal weiter — Konto und Geräte-Sync
            schaltest du frei, indem in Vercel <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> gesetzt sind.
          </p>
        </div>
      ) : user ? (
        <>
          <div className="card">
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
            <SyncRow />
            <button
              className="btn wide"
              style={{ marginTop: 14 }}
              onClick={async () => {
                await signOut();
                toast("Abgemeldet — deine Daten bleiben auf dem Gerät");
              }}
            >
              Abmelden
            </button>
          </div>

          <div className="group">
            <button className="row tappable" onClick={() => setOpenPanel(openPanel === "password" ? null : "password")}>
              <span className="row-title">
                Passwort ändern
                {recovery ? <span className="row-sub">Aus der Zurücksetzen-Mail — jetzt neu setzen</span> : null}
              </span>
              <span className="chevron">›</span>
            </button>
            {openPanel === "password" ? (
              <div style={{ padding: "4px 16px 14px" }}>
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Neues Passwort (min. 6 Zeichen)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  className="btn wide filled"
                  disabled={busy || newPassword.length < 6}
                  onClick={() =>
                    void guard(async () => {
                      await updatePassword(newPassword);
                      setNewPassword("");
                      setOpenPanel(null);
                      setRecovery(false);
                    }, "Passwort geändert")
                  }
                >
                  Speichern
                </button>
              </div>
            ) : null}

            <button className="row tappable" onClick={() => setOpenPanel(openPanel === "email" ? null : "email")}>
              <span className="row-title">
                E-Mail ändern
                <span className="row-sub">Bestätigung geht an beide Adressen</span>
              </span>
              <span className="chevron">›</span>
            </button>
            {openPanel === "email" ? (
              <div style={{ padding: "4px 16px 14px" }}>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  placeholder="Neue E-Mail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <button
                  className="btn wide filled"
                  disabled={busy || !newEmail.includes("@")}
                  onClick={() =>
                    void guard(async () => {
                      await updateEmail(newEmail.trim());
                      setNewEmail("");
                      setOpenPanel(null);
                    }, "Bestätigungsmail unterwegs")
                  }
                >
                  Ändern
                </button>
              </div>
            ) : null}
          </div>

          <div className="card">
            <p style={{ margin: "0 0 12px", fontSize: 15 }}>
              <b>Cloud-Daten löschen</b> entfernt deine Zeile in der Datenbank. Auf diesem Gerät bleibt alles liegen — beim
              nächsten Sync würde es wieder hochgeladen. Das Anmelde-Konto selbst bleibt bestehen; das kann nur im
              Supabase-Dashboard entfernt werden, dafür bräuchte die App Rechte, die eine öffentliche App nicht haben darf.
            </p>
            {confirmCloud ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn danger filled"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onClick={() =>
                    void guard(async () => {
                      await deleteRemote(user.id);
                      setConfirmCloud(false);
                    }, "Cloud-Daten gelöscht")
                  }
                >
                  Wirklich löschen
                </button>
                <button className="btn" onClick={() => setConfirmCloud(false)}>Abbrechen</button>
              </div>
            ) : (
              <button className="btn wide danger" onClick={() => setConfirmCloud(true)}>Cloud-Daten löschen</button>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="segmented" style={{ marginBottom: 14 }}>
            <button aria-selected={mode === "signin"} onClick={() => setMode("signin")}>Anmelden</button>
            <button aria-selected={mode === "signup"} onClick={() => setMode("signup")}>Konto erstellen</button>
          </div>
          <input className="field" type="email" autoComplete="email" inputMode="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="field"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
          <button className="btn wide filled" disabled={busy || !ready} onClick={() => void submit()}>
            {busy ? "Moment…" : mode === "signup" ? "Konto erstellen" : "Anmelden"}
          </button>
          {mode === "signin" ? (
            <button
              className="btn plain wide"
              style={{ marginTop: 6 }}
              disabled={busy}
              onClick={() =>
                void guard(async () => {
                  if (!email.trim()) throw new Error("Erst die E-Mail eintragen");
                  await sendPasswordReset(email.trim());
                }, "Mail unterwegs — der Link führt zurück hierher")
              }
            >
              Passwort vergessen?
            </button>
          ) : null}
          <p style={{ fontSize: 13, color: "var(--label-2)", margin: "12px 4px 0" }}>
            Mit Konto liegen deine Daten zusätzlich in deiner Datenbank und sind auf Handy und PC gleich. Ohne Konto funktioniert
            alles genauso — nur eben nur auf diesem Gerät.
          </p>
        </div>
      )}

      {/* Daten */}
      <p className="section-title">Daten</p>
      <div className="group">
        <button className="row tappable" onClick={() => { download(`vier-saeulen-${todayKey()}.json`, JSON.stringify(data, null, 2), "application/json"); haptic("tap"); }}>
          <span className="row-title">Backup herunterladen<span className="row-sub">JSON — alles, inklusive Sequenzen und Profil</span></span>
        </button>
        <button className="row tappable" onClick={() => { download(`vier-saeulen-${todayKey()}.csv`, csvFrom(data), "text/csv;charset=utf-8"); haptic("tap"); }}>
          <span className="row-title">CSV herunterladen<span className="row-sub">Für Tabellen — ein Tag pro Zeile</span></span>
        </button>
        <button
          className="row tappable"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(data));
              toast("In die Zwischenablage kopiert");
            } catch {
              toast("Kopieren hat der Browser blockiert");
            }
          }}
        >
          <span className="row-title">Backup kopieren<span className="row-sub">Als Text, z. B. in Notizen</span></span>
        </button>
      </div>

      <div className="card">
        <p className="field-label">Backup einspielen</p>
        <input
          type="file"
          accept="application/json,.json"
          style={{ fontSize: 14, marginBottom: 12 }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { setImportText(String(reader.result ?? "")); toast("Datei geladen — jetzt einspielen"); };
            reader.readAsText(file);
          }}
        />
        <textarea
          className="field"
          style={{ background: "var(--card-2)", minHeight: 90, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"v":2,…}'
        />
        <button className="btn wide danger" onClick={runImport} disabled={!importText.trim()}>
          Ersetzen und einspielen
        </button>
      </div>

      {/* App */}
      <p className="section-title">App</p>
      <div className="card">
        <p style={{ margin: 0, fontSize: 15 }}>
          <b>Auf dem Homescreen:</b> Samsung Internet oder Chrome → Menü <b>⋮</b> → <b>App installieren</b> bzw. „Seite hinzufügen zu →
          Startbildschirm“. Danach läuft sie ohne Browserleiste und startet auch ohne Netz.
        </p>
      </div>

      <div className="card">
        <p style={{ margin: "0 0 12px", fontSize: 15 }}>
          <b>Neu anfangen</b> löscht Routinen, Ziele, Sequenzen, Profil und alle Tage auf diesem Gerät. Vorher exportieren.
        </p>
        {confirmWipe ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn danger filled" style={{ flex: 1 }} onClick={() => { resetAll(); setConfirmWipe(false); haptic("warn"); toast("Neu gestartet"); }}>
              Wirklich löschen
            </button>
            <button className="btn" onClick={() => setConfirmWipe(false)}>Abbrechen</button>
          </div>
        ) : (
          <button className="btn wide danger" onClick={() => setConfirmWipe(true)}>Alles löschen</button>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--label-3)", textAlign: "center", margin: "8px 0 0" }}>
        Vier Säulen · lokal gespeichert{cloudEnabled ? ", optional in deiner Supabase" : ""}
      </p>
    </>
  );
}
