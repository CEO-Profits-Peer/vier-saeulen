"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Hydrated } from "@/components/Hydrated";
import { Avatar as PeerAvatar } from "@/components/Avatar";
import { Ring } from "@/components/Ring";
import { toast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/auth";
import { netMessage, useNet } from "@/lib/net";
import { cloudEnabled } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { dayStats, streak as streakOf } from "@/lib/score";
import { todayKey } from "@/lib/date";
import { PILLARS, type Pillar } from "@/lib/types";
import {
  HANDLE_RE,
  acceptFriend,
  findByHandle,
  getMyProfile,
  loadFriends,
  publishToday,
  removeFriendship,
  requestFriend,
  saveMyProfile,
  suggestHandle,
  unpublishAll,
  type FriendProfile,
  type FriendRow,
  type PendingRow,
} from "@/lib/friends";

export default function FriendsPage() {
  return (
    <Hydrated>
      <Friends />
    </Hydrated>
  );
}

function Avatar({ p, size = 40 }: { p: FriendProfile; size?: number }) {
  /* Das Freundesprofil traegt dieselben Felder wie das eigene — nur flacher.
     Hier wird es auf die Form gebracht, die die gemeinsame Darstellung kennt. */
  return (
    <PeerAvatar
      size={size}
      fallback={p.handle}
      profile={{
        name: p.display_name || p.handle,
        emoji: p.emoji,
        accent: p.accent,
        avatar: p.avatar ?? (p.emoji ? "emoji" : "letter"),
        sigil: p.sigil ?? undefined,
        updatedAt: 0,
      }}
    />
  );
}

function Friends() {
  const data = useStore((s) => s.data);
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const online = useNet((s) => s.online);

  const [me, setMe] = useState<FriendProfile | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [handle, setHandle] = useState("");
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<FriendProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const key = todayKey();
  const myScore = dayStats(data, key).pct;
  const myStreak = streakOf(data);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await getMyProfile(user.id);
      setMe(profile);
      if (profile) {
        const { friends: f, pending: p } = await loadFriends(user.id, key);
        setFriends(f);
        setPending(p);
      }
    } catch (err) {
      toast(netMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user, key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* Den eigenen Score teilen, solange ein Profil existiert. Bewusst nur der
     Prozentwert und die Serie — alles andere bleibt auf dem Gerät. */
  useEffect(() => {
    if (!user || !me) return;
    const t = setTimeout(() => {
      void publishToday(user.id, key, myScore, myStreak).catch(() => {
        /* Kein Netz: der nächste Aufruf holt es nach. */
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [user, me, key, myScore, myStreak]);

  /* Profiländerungen nachziehen: wer seinen Avatar wechselt, soll bei Freunden
     nicht wochenlang mit dem alten stehen. Gebündelt, damit nicht jeder
     Reglerzug eine Anfrage auslöst. */
  useEffect(() => {
    if (!user || !me) return;
    const p = data.profile;
    const next = {
      display_name: p?.name ?? "",
      emoji: p?.emoji ?? "",
      accent: (p?.accent ?? "learn") as Pillar,
      avatar: p?.avatar ?? (p?.emoji ? "emoji" : "letter"),
      sigil: p?.sigil ?? null,
    };
    const same =
      me.display_name === next.display_name &&
      me.emoji === next.emoji &&
      me.accent === next.accent &&
      (me.avatar ?? "letter") === next.avatar &&
      JSON.stringify(me.sigil ?? null) === JSON.stringify(next.sigil);
    if (same) return;

    const t = setTimeout(() => {
      void saveMyProfile(user.id, next)
        .then(() => setMe((cur) => (cur ? { ...cur, ...next } : cur)))
        .catch(() => {
          /* Offline oder Spalten fehlen — der nächste Versuch holt es nach. */
        });
    }, 2500);
    return () => clearTimeout(t);
  }, [user, me, data.profile]);

  const guard = async (fn: () => Promise<void>, ok?: string) => {
    if (!online) return toast("Dafür braucht es eine Verbindung");
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      haptic("success");
    } catch (err) {
      toast(netMessage(err));
      haptic("warn");
    } finally {
      setBusy(false);
    }
  };

  if (!cloudEnabled) {
    return (
      <>
        <Nav title="Freunde" subtitle="Braucht ein Konto." />
        <div className="empty">Ohne Supabase-Konfiguration gibt es keine Freunde-Funktion.</div>
      </>
    );
  }

  if (ready && !user) {
    return (
      <>
        <Nav title="Freunde" subtitle="Erst anmelden, dann verbinden." />
        <div className="card">
          <p style={{ margin: "0 0 12px", fontSize: 15 }}>
            Freunde brauchen ein Konto — sonst gibt es niemanden, mit dem sich etwas verknüpfen ließe.
          </p>
          <Link href="/du" className="btn wide filled">Zum Konto</Link>
        </div>
      </>
    );
  }

  /* Ohne öffentliches Profil kann dich niemand finden. */
  if (!loading && user && !me) {
    const proposal = suggestHandle(data.profile?.name || user.email?.split("@")[0] || "");
    return (
      <>
        <Nav title="Freunde" subtitle="Ein Handle, dann kann man dich finden." />
        <div className="card">
          <p className="field-label">Dein Handle</p>
          <input
            className="field"
            value={handle}
            placeholder={proposal}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          />
          <p style={{ fontSize: 13, color: "var(--label-2)", margin: "0 4px 12px" }}>
            3–20 Zeichen, nur Kleinbuchstaben, Ziffern und Unterstrich. Freunde geben ihn ein, um dich zu finden —
            eine Suche über die Nutzerliste gibt es bewusst nicht.
          </p>
          <button
            className="btn wide filled"
            disabled={busy || !HANDLE_RE.test(handle || proposal)}
            onClick={() =>
              void guard(async () => {
                await saveMyProfile(user.id, {
                  handle: handle || proposal,
                  display_name: data.profile?.name ?? "",
                  emoji: data.profile?.emoji ?? "",
                  accent: (data.profile?.accent ?? "learn") as Pillar,
                  avatar: data.profile?.avatar ?? (data.profile?.emoji ? "emoji" : "letter"),
                  sigil: data.profile?.sigil ?? null,
                });
                await refresh();
              }, "Profil angelegt")
            }
          >
            Handle sichern
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav
        title="Freunde"
        subtitle={me ? `Du bist @${me.handle}` : "Lädt…"}
        right={
          <button
            className="badge"
            onClick={async () => {
              if (!me) return;
              const text = `Füg mich in Vier Säulen hinzu: @${me.handle}`;
              try {
                if (navigator.share) await navigator.share({ text });
                else {
                  await navigator.clipboard.writeText(text);
                  toast("Handle kopiert");
                }
              } catch {
                /* Abbruch ist kein Fehler */
              }
            }}
          >
            ↗ Handle
          </button>
        }
      />

      {/* Eigener Stand zum Vergleich */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Ring pct={myScore} color="var(--tint)" size={54} stroke={6}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{myScore}</span>
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>Du heute</div>
            <div style={{ fontSize: 13, color: "var(--label-2)" }}>
              {myStreak > 0 ? `🔥 ${myStreak} Tage Serie` : "Noch keine Serie"}
            </div>
          </div>
        </div>
      </div>

      {/* Offene Anfragen */}
      {pending.length ? (
        <>
          <p className="section-title">Anfragen</p>
          <div className="group">
            {pending.map((p) => (
              <div key={p.id} className="row">
                <Avatar p={p.profile} size={36} />
                <span className="row-title">
                  {p.profile.display_name || `@${p.profile.handle}`}
                  <span className="row-sub">
                    {p.outgoing ? "Anfrage gesendet" : `@${p.profile.handle} will sich verbinden`}
                  </span>
                </span>
                {p.outgoing ? (
                  <button
                    className="btn plain"
                    disabled={busy}
                    onClick={() => void guard(async () => { await removeFriendship(p.id); await refresh(); }, "Zurückgezogen")}
                  >
                    Abbrechen
                  </button>
                ) : (
                  <span style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn plain"
                      disabled={busy}
                      onClick={() => void guard(async () => { await acceptFriend(p.id); await refresh(); }, "Verbunden")}
                    >
                      Annehmen
                    </button>
                    <button
                      className="btn plain danger"
                      disabled={busy}
                      onClick={() => void guard(async () => { await removeFriendship(p.id); await refresh(); })}
                    >
                      Ablehnen
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Freunde mit heutigem Stand */}
      <p className="section-title">Heute</p>
      {friends.length ? (
        <div className="group">
          {friends.map((f) => (
            <div key={f.id} className="row">
              <Avatar p={f} size={38} />
              <span className="row-title">
                {f.display_name || `@${f.handle}`}
                <span className="row-sub">
                  {f.score === null ? "hat heute noch nichts geteilt" : `${f.streak ?? 0} Tage Serie`}
                </span>
              </span>
              {f.score === null ? (
                <span className="row-value">—</span>
              ) : (
                <Ring pct={f.score} color={`var(${PILLARS[f.accent]?.varName ?? "--tint"})`} size={38} stroke={5}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{f.score}</span>
                </Ring>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          {loading ? "Lädt…" : "Noch niemand verbunden. Unten den Handle einer Freundin oder eines Freundes eingeben."}
        </div>
      )}

      {/* Jemanden hinzufügen */}
      <p className="section-title">Hinzufügen</p>
      <div className="card">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="field"
            style={{ marginBottom: 0, flex: 1 }}
            value={search}
            placeholder="handle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => { setSearch(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setFound(null); }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              void guard(async () => {
                const hit = await findByHandle(search);
                setFound(hit);
                if (!hit) toast("Diesen Handle gibt es nicht");
              });
            }}
          />
          <button
            className="btn"
            disabled={busy || !HANDLE_RE.test(search)}
            onClick={() =>
              void guard(async () => {
                const hit = await findByHandle(search);
                setFound(hit);
                if (!hit) toast("Diesen Handle gibt es nicht");
              })
            }
          >
            Suchen
          </button>
        </div>

        {found ? (
          <div className="row" style={{ marginTop: 12, paddingLeft: 0, paddingRight: 0 }}>
            <Avatar p={found} size={38} />
            <span className="row-title">
              {found.display_name || `@${found.handle}`}
              <span className="row-sub">@{found.handle}</span>
            </span>
            <button
              className="btn filled"
              disabled={busy || !user}
              onClick={() =>
                void guard(async () => {
                  await requestFriend(user!.id, found.id);
                  setFound(null);
                  setSearch("");
                  await refresh();
                }, "Anfrage gesendet")
              }
            >
              Anfragen
            </button>
          </div>
        ) : null}

        <p style={{ fontSize: 13, color: "var(--label-2)", margin: "12px 4px 0" }}>
          Freunde sehen ausschließlich deinen Tagesscore in Prozent und deine Serie. Keine Routinen, keine Notizen,
          keine Check-ins.
        </p>
      </div>

      {friends.length || pending.length ? (
        <div className="card">
          <button
            className="btn wide danger"
            disabled={busy || !user}
            onClick={() =>
              void guard(async () => {
                await unpublishAll(user!.id);
                await refresh();
              }, "Geteilte Stände gelöscht")
            }
          >
            Geteilte Stände löschen
          </button>
          <p style={{ fontSize: 13, color: "var(--label-2)", margin: "10px 4px 0" }}>
            Entfernt alles, was Freunde von dir sehen. Solange ein Profil besteht, wird der heutige Stand danach
            wieder geteilt — willst du das dauerhaft aus, lös die Freundschaften.
          </p>
        </div>
      ) : null}
    </>
  );
}
