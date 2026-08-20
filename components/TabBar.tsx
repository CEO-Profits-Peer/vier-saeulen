"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { TabFlow, TabFriends, TabProgress, TabToday, TabYou } from "./Icons";

/* Sortiert nach Häufigkeit: was täglich passiert, liegt links unter dem Daumen.
   Ziele und Stats teilen sich „Fortschritt“ — beide beantworten dieselbe Frage.
   Der Routinen-Editor ist unter „Du“ gewandert: nach dem Einrichten öffnet man
   ihn kaum noch, als eigener Tab hat er einen Platz belegt, den Freunde
   dringender brauchen. */
const TABS = [
  { href: "/", key: "today", Icon: TabToday },
  { href: "/flow", key: "flow", Icon: TabFlow },
  { href: "/fortschritt", key: "progress", Icon: TabProgress },
  { href: "/friends", key: "friends", Icon: TabFriends },
  { href: "/du", key: "you", Icon: TabYou },
] as const;

/* Die alten Adressen leiten weiter, markieren aber schon beim Antippen den
   richtigen Tab — sonst blinkt die Auswahl kurz auf den falschen. */
const ALIASES: Record<string, string> = {
  "/goals": "/fortschritt",
  "/stats": "/fortschritt",
  "/system": "/du",
  "/account": "/du",
};

const isActive = (href: string, pathname: string) => {
  const p = ALIASES[pathname] ?? pathname;
  return href === "/" ? p === "/" : p.startsWith(href);
};

export function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const index = TABS.findIndex((tab) => isActive(tab.href, pathname));

  return (
    <nav className="tabbar" aria-label={t.app.name}>
      <div className="tabbar-inner">
        {/* Eine Pille für alle Tabs: sie ist genau einen Tab breit und wandert
            per Transform um ihre eigene Breite. Die Federung macht die
            CSS-Transition — für eine reine Verschiebung braucht es keine
            Animations-Engine. */}
        {index >= 0 ? (
          <span
            className="tab-glow"
            aria-hidden
            style={{
              width: `${100 / TABS.length}%`,
              transform: `translateX(${index * 100}%)`,
            }}
          >
            <i />
          </span>
        ) : null}

        {TABS.map(({ href, key, Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className="tab"
              data-active={active}
              onClick={() => haptic("tap")}
              aria-current={active ? "page" : undefined}
            >
              <Icon active={active} />
              <span>{t.tabs[key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
