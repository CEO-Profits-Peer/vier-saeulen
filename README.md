# Vier Säulen

Eine Tages-App fürs Handy: **Learn · Body · Image · Money**. Ein Score pro Tag, ein Flow-Timer
für getaktete Sessions, Ziele mit Tempo-Rechnung — und nach zwei Wochen sieht man Muster, die
im Alltag untergehen.

Next.js · React · Zustand · Supabase (optional) · PWA · deploybar auf Vercel.

## Was die App kann

| Bereich | Inhalt |
|---|---|
| **Heute** | Tagesscore aus gewichteten Punkten, vier Säulen-Ringe, „Als Nächstes" passend zur Uhrzeit, Routinen nach Morgen/Schule/Nachmittag/Abend, Einmal-Aufgaben, Abend-Check-in (Energie, Fokus, Schlaf, Screen, Win, Notiz) |
| **Flow** | Programmierbare Sequenzen — z. B. 15 Lesen → 5 Bewegen → 15 Lernen → 5 Workout → 15 Chill. Ein Knopf startet, der Timer führt durch: Ring, Restzeit, nächster Block, Ton und Vibration beim Wechsel, Pause/Skip, Minimieren als Leiste über der Tab-Bar. Jeder Block zählt auf eine Säule und kann eine Routine automatisch abhaken. |
| **System** | Routinen-Editor: Name, Säule, Tageszeit, Wochentage, Punktegewicht |
| **Ziele** | Zahl + Deadline, Fortschritt, Soll-Ist-Vergleich und nötiges Wochentempo |
| **Stats** | 6 Kennzahlen, 12-Wochen-Heatmap, 14-Tage-Trend, Säulen-Balance, Flow-Minuten, Wochenreview mit Archiv |
| **Konto** | Optionaler Account (Supabase) mit Geräte-Sync, JSON/CSV-Export, Import, Reset |

Streak = Tage über 60 % Tagesscore. XP = geholte Punkte, Level steigen mit wachsendem Bedarf.

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Ohne Supabase-Keys läuft alles lokal (localStorage) — nur Konto und Sync fehlen.
Für die Cloud `.env.example` nach `.env.local` kopieren und die beiden Werte eintragen.

```bash
npm run build && npm start   # Produktionsbuild prüfen
```

## Deployment

Schritt für Schritt in **[DEPLOY.md](./DEPLOY.md)**: Vercel-Import, Supabase-Projekt, SQL aus
`supabase/schema.sql`, Umgebungsvariablen, Installation auf dem Handy.

## Technische Entscheidungen

- **Local-first.** Jede Änderung landet sofort in `localStorage`; die Cloud ist ein Zusatz, kein
  Nadelöhr. Ohne Netz funktioniert die App vollständig.
- **Sync ohne Datenverlust.** Beim Anmelden werden lokaler und entfernter Stand pro Eintrag über
  `updatedAt` zusammengeführt — nicht überschrieben. Löschungen sind Tombstones (`deletedAt`),
  damit sie sich nicht durch einen Merge zurückholen.
- **Timer aus Zeitstempeln.** Die Restzeit ergibt sich aus `Date.now()`, nie aus gezählten Ticks.
  Reload, Hintergrund und gedrosselte Timer ändern nichts am Ergebnis. Der Bildschirm bleibt per
  Wake Lock an, solange eine Sequenz läuft.
- **Farben validiert.** Die vier Säulenfarben sind Apple-Systemfarben (Blau, Türkis, Pink, Orange)
  und bestehen als Set die Prüfung auf Farbfehlsichtigkeit und Kontrast in Hell und Dunkel
  (all-pairs CVD ΔE ≥ 13, Normalsicht ΔE ≥ 18,7).
- **Kein Analytics, kein Tracking.** Die Daten gehören der Person, die sie einträgt.

## Struktur

```
app/            Routen (Heute, Flow, System, Ziele, Stats, Konto)
components/     UI-Bausteine, Flow-Runner/Engine, Sheets, Charts
lib/            Typen, Store (Zustand), Scoring, Sync, Timer-Helfer
supabase/       schema.sql für die Cloud
public/         Manifest, Service Worker, Icons
vier-saeulen.html   Prototyp v1 (eine Datei, ohne Build) — bleibt als Referenz liegen
```
