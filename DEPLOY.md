# Deployment — Vercel + Supabase

Ungefähr 15 Minuten. Reihenfolge einhalten: erst Supabase, dann Vercel.

## 1 · Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) mit GitHub anmelden → **New project**.
2. Name z. B. `vier-saeulen`, Region **Frankfurt** (oder was näher liegt), Datenbank-Passwort
   setzen und **notieren** — das brauchst du nur für die Datenbank selbst, nicht für die App.
3. Warten, bis das Projekt bereit ist (1–2 Minuten).

### Tabelle anlegen

Im Projekt links **SQL Editor** → **New query** → den kompletten Inhalt von
[`supabase/schema.sql`](./supabase/schema.sql) einfügen → **Run**.

Das legt die Tabelle `app_state` an und schaltet Row Level Security ein: Jede angemeldete Person
kann ausschließlich die eigene Zeile lesen und schreiben.

### Anmeldung einstellen

**Authentication → Providers → Email** ist standardmäßig an. Zwei Optionen:

- **Mit E-Mail-Bestätigung** (Standard): nach der Registrierung kommt eine Mail, erst danach ist
  der Login möglich.
- **Ohne Bestätigung** (bequemer, wenn nur du das Konto nutzt): **Authentication → Sign In / Providers
  → Email → "Confirm email"** ausschalten.

Unter **Authentication → URL Configuration** die **Site URL** auf deine spätere Vercel-Adresse
setzen (z. B. `https://routines-peer.vercel.app`) — sonst zeigen Bestätigungslinks auf localhost.

### Keys kopieren

**Project Settings → API**:

- `Project URL` → das ist `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `public` key → das ist `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Der `service_role`-Key gehört **nirgendwo** in die App und in keinen Chat. Der `anon`-Key darf
> öffentlich sein — RLS ist das, was schützt.

## 2 · Auf Vercel deployen

Das Projekt ist bereits angelegt und mit GitHub verbunden:

| | |
|---|---|
| Vercel-Projekt | `vier-saeulen` (Scope `ceo-profits-peer-s-projects`) |
| Repository | `CEO-Profits-Peer/vier-saeulen`, Branch `main` |
| Live-Adresse | `https://routines-peer.vercel.app` |

Jeder Push auf `main` löst automatisch ein neues Production-Deployment aus. Von Hand geht es
mit `vercel deploy --prod` aus dem Projektordner.

### Deployment Protection ausschalten

Neue Projekte in diesem Team stehen standardmäßig hinter **Vercel Authentication** — dann
landet jeder Aufruf auf einer Vercel-Login-Seite, und auf dem Handy ist die App nicht
erreichbar. Einmalig abschalten:

**Vercel → Projekt `vier-saeulen` → Settings → Deployment Protection → Vercel Authentication
→ auf `Disabled` stellen → Save.**

Danach ist die Adresse öffentlich. Die Daten schützt nicht die Vercel-Sperre, sondern der
Supabase-Login samt Row Level Security.

### Umgebungsvariablen

Unter **Settings → Environment Variables** beide Werte für alle drei Umgebungen eintragen:

| Name | Wert |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL aus Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key aus Supabase |

Ohne die beiden Variablen startet die App trotzdem — dann eben ohne Konto und ohne Sync.
Nachträglich hinzufügen geht jederzeit: Variablen setzen → **Redeploy**.

## 3 · Aufs Handy holen

Auf dem Samsung in **Chrome** oder **Samsung Internet** die Vercel-Adresse öffnen →
Menü **⋮** → **App installieren** bzw. **Seite hinzufügen zu → Startbildschirm**.

Danach startet sie ohne Browserleiste, mit eigenem Icon, und die App-Hülle liegt im Cache —
sie öffnet also auch ohne Netz. Anmelden nur einmal nötig; die Sitzung bleibt bestehen.

## 4 · Prüfen, ob der Sync läuft

1. Auf dem Handy unter **Konto** registrieren bzw. anmelden.
2. Irgendetwas abhaken.
3. Am PC dieselbe Adresse öffnen, mit demselben Konto anmelden — der Stand ist da.

Läuft etwas schief, hilft in Supabase **Table Editor → app_state**: Dort muss genau eine Zeile
mit deiner `user_id` stehen. Bleibt sie leer, stimmt meistens eine der beiden Umgebungsvariablen
nicht oder das SQL wurde nicht ausgeführt.

## Kosten

Beide Dienste haben kostenlose Stufen, die für eine private App weit reichen: Vercel Hobby und
Supabase Free. Für dieses Datenvolumen (ein paar hundert Kilobyte) fällt nichts an.
