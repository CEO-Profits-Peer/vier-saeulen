"use client";

import { useState } from "react";
import { Avatar, SigilMark, sigilOf } from "./Avatar";
import { ViewSwitch } from "./ViewSwitch";
import { haptic } from "@/lib/haptics";
import { useStore } from "@/lib/store";
import { PILLARS, PKEYS, type AvatarKind, type Sigil, type SigilBar } from "@/lib/types";

/* Tiere zuerst — danach der Rest. Emoji statt gezeichneter Symbole, weil sie
   auf jedem Gerät sauber aussehen und mitwachsen, wenn das System sie
   aktualisiert. */
const ANIMALS = ["🦊", "🐺", "🦉", "🐻", "🦅", "🐬", "🦌", "🐈", "🦁", "🐢", "🦈", "🐝", "🦇", "🐙", "🦋", "🐉"];
const SYMBOLS = ["🎯", "🔥", "⚡", "🌱", "🧠", "💪", "📈", "🌙", "☕", "🎧", "⚔️", "🧭"];

/* Voreinstellungen fürs eigene Zeichen. Der erste nimmt die Säulenfarben, die
   übrigen sind Ausgangspunkte zum Weiterdrehen. */
const PRESETS: { name: string; colors: [string, string, string, string] }[] = [
  { name: "Säulen", colors: ["#007aff", "#30b0c7", "#ff2d55", "#ff9500"] },
  { name: "Kupfer", colors: ["#b4622b", "#d98a4e", "#8c4a20", "#e6b17e"] },
  { name: "Tiefsee", colors: ["#0a3d62", "#1e6091", "#168aad", "#34a0a4"] },
  { name: "Mono", colors: ["#8e8e93", "#aeaeb2", "#636366", "#c7c7cc"] },
  { name: "Neon", colors: ["#7b2ff7", "#f107a3", "#00d4ff", "#00ff87"] },
];

export function AvatarEditor({ fallback }: { fallback?: string }) {
  const profile = useStore((s) => s.data.profile);
  const setProfile = useStore((s) => s.setProfile);

  const kind: AvatarKind = profile?.avatar ?? (profile?.emoji ? "emoji" : "letter");
  const [tab, setTab] = useState<AvatarKind>(kind);
  const sigil = sigilOf(profile);

  const setBar = (index: number, patch: Partial<SigilBar>) => {
    const bars = sigil.bars.map((b, i) => (i === index ? { ...b, ...patch } : b)) as Sigil["bars"];
    setProfile({ sigil: { bars }, avatar: "sigil" });
  };

  const pickEmoji = (emoji: string) => {
    setProfile({ emoji, avatar: "emoji" });
    haptic("tap");
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ViewSwitch
        value={tab}
        label="Art des Profilbilds"
        onChange={(next) => {
          setTab(next);
          /* Der Wechsel selbst ist schon die Wahl — sonst müsste man erst
             umschalten und dann nochmal etwas antippen. */
          if (next === "letter") setProfile({ avatar: "letter" });
          if (next === "sigil") setProfile({ avatar: "sigil", sigil });
          if (next === "emoji" && profile?.emoji) setProfile({ avatar: "emoji" });
        }}
        options={[
          { value: "sigil", label: "Zeichen" },
          { value: "emoji", label: "Tiere" },
          { value: "letter", label: "Buchstabe" },
        ]}
      />

      {tab === "emoji" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ANIMALS.map((e) => (
              <button
                key={e}
                className="chip"
                aria-pressed={kind === "emoji" && profile?.emoji === e}
                aria-label={`Tier ${e}`}
                style={{ fontSize: 21, minHeight: 44, padding: "6px 11px" }}
                onClick={() => pickEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <p className="field-label" style={{ margin: "2px 4px 0" }}>Sonstige</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SYMBOLS.map((e) => (
              <button
                key={e}
                className="chip"
                aria-pressed={kind === "emoji" && profile?.emoji === e}
                aria-label={`Symbol ${e}`}
                style={{ fontSize: 19, minHeight: 40, padding: "5px 10px" }}
                onClick={() => pickEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "letter" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--label-2)" }}>
            Der erste Buchstabe deines Namens auf der Akzentfarbe.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {PKEYS.map((p) => (
              <button
                key={p}
                onClick={() => { setProfile({ accent: p }); haptic("tap"); }}
                aria-label={PILLARS[p].label}
                aria-pressed={(profile?.accent ?? "learn") === p}
                className={PILLARS[p].cls}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--p)",
                  boxShadow:
                    (profile?.accent ?? "learn") === p
                      ? "inset 0 0 0 2px var(--bg), inset 0 0 0 4px var(--p)"
                      : "inset 0 1px 0 0 rgba(255,255,255,.3)",
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "sigil" ? (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Große Vorschau — das Zeichen soll man beim Drehen wachsen sehen */}
          <div style={{ display: "grid", placeItems: "center", padding: "6px 0 2px" }}>
            <SigilMark sigil={sigil} size={104} />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {sigil.bars.map((bar, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label
                  htmlFor={`sigil-color-${i}`}
                  style={{
                    position: "relative",
                    width: 34,
                    height: 34,
                    flex: "none",
                    borderRadius: 9,
                    background: bar.c,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15), inset 0 1px 0 0 rgba(255,255,255,.35)",
                    cursor: "pointer",
                  }}
                >
                  {/* Der native Farbwähler liegt unsichtbar darüber: er öffnet
                      auf dem Handy die Systemauswahl, sieht aber überall
                      anders aus — deshalb das eigene Feld als Anzeige. */}
                  <input
                    id={`sigil-color-${i}`}
                    type="color"
                    value={bar.c}
                    aria-label={`Farbe der ${i + 1}. Säule`}
                    onChange={(e) => setBar(i, { c: e.target.value })}
                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                  />
                </label>

                <input
                  type="range"
                  min={10}
                  max={100}
                  step={2}
                  value={bar.h}
                  aria-label={`Höhe der ${i + 1}. Säule`}
                  onChange={(e) => setBar(i, { h: Number(e.target.value) })}
                  style={{ flex: 1, minWidth: 0, accentColor: bar.c }}
                />

                <span className="mono" style={{ width: 34, textAlign: "right", fontSize: 13, color: "var(--label-2)" }}>
                  {bar.h}
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="field-label" style={{ margin: "0 4px 8px" }}>Farbsätze</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className="chip"
                  onClick={() => {
                    const bars = sigil.bars.map((b, i) => ({ ...b, c: preset.colors[i] })) as Sigil["bars"];
                    setProfile({ sigil: { bars }, avatar: "sigil" });
                    haptic("tap");
                  }}
                >
                  <span style={{ display: "inline-flex", gap: 2, marginRight: 2 }}>
                    {preset.colors.map((c) => (
                      <i key={c} style={{ width: 7, height: 14, borderRadius: 4, background: c, display: "block" }} />
                    ))}
                  </span>
                  {preset.name}
                </button>
              ))}
              <button
                className="chip"
                onClick={() => {
                  const rand = () =>
                    "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
                  const bars = sigil.bars.map(() => ({
                    h: 20 + Math.round(Math.random() * 78),
                    c: rand(),
                  })) as Sigil["bars"];
                  setProfile({ sigil: { bars }, avatar: "sigil" });
                  haptic("tap");
                }}
              >
                Würfeln
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Was am Ende im Konto steht */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
        <Avatar profile={profile} fallback={fallback} size={40} />
        <span style={{ fontSize: 13, color: "var(--label-2)" }}>So erscheinst du bei Freunden.</span>
      </div>
    </div>
  );
}
