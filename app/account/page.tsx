"use client";

import Link from "next/link";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { useAuth, signIn, signOut, signUp } from "@/lib/auth";
import { cloudEnabled } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { dayStats } from "@/lib/score";
import { DAY_ABBR, type AppData } from "@/lib/types";
import { fromKey, todayKey } from "@/lib/date";

export default function AccountPage() {
  return (
    <Hydrated>
      <Account />
    </Hydrated>
  );
}

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
    const pp = (p: "learn" | "body" | "image" | "money") => (s.by[p].total ? Math.round((s.by[p].done / s.by[p].total) * 100) : "");
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

function Account() {
  const data = useStore((s) => s.data);
  const setData = useStore((s) => s.setData);
  const resetAll = useStore((s) => s.resetAll);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  const dayCount = Object.keys(data.days).length;

  const submit = async () => {
    if (!email.trim() || !password) return toast("E-Mail und Passwort ausfüllen");
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password);
        toast("Konto erstellt — check deine Mails zur Bestätigung");
      } else {
        await signIn(email.trim(), password);
        toast("Angemeldet");
      }
      haptic("success");
      setPassword("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Hat nicht geklappt");
      haptic("warn");
    } finally {
      setBusy(false);
    }
  };

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

      {/* Konto & Sync */}
      <p className="section-title">Sync</p>
      {!cloudEnabled ? (
        <div className="card">
          <p style={{ margin: 0, fontSize: 15 }}>
            Cloud ist für diese Installation nicht eingerichtet. Die App läuft komplett lokal weiter — Konto und Geräte-Sync
            schaltest du frei, indem in Vercel <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> gesetzt sind.
          </p>
        </div>
      ) : user ? (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--tint)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18 }}>
              {(user.email ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
              <div style={{ fontSize: 13, color: "var(--label-2)" }}>
                {lastSyncedAt ? `Zuletzt gesynct ${new Date(lastSyncedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}` : "Noch nicht gesynct"}
              </div>
            </div>
          </div>
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
          <span className="row-title">Backup herunterladen<span className="row-sub">JSON — alles, inklusive Sequenzen</span></span>
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
          <b>Neu anfangen</b> löscht Routinen, Ziele, Sequenzen und alle Tage auf diesem Gerät. Vorher exportieren.
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
