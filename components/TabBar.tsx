"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { TabFlow, TabFriends, TabProgress, TabToday, TabYou } from "./Icons";

/* Sortiert nach Häufigkeit: was täglich passiert, liegt links unter dem Daumen.
   Ziele und Stats teilen sich „Fortschritt“ — beide beantworten dieselbe Frage.
   Der Routinen-Editor ist unter „Du“ gewandert: nach dem Einrichten öffnet man
   ihn kaum noch, als eigener Tab hat er einen Platz belegt, den Freunde
   dringender brauchen. */
const TABS = [
  { href: "/", label: "Heute", Icon: TabToday },
  { href: "/flow", label: "Flow", Icon: TabFlow },
  { href: "/fortschritt", label: "Fortschritt", Icon: TabProgress },
  { href: "/friends", label: "Freunde", Icon: TabFriends },
  { href: "/du", label: "Du", Icon: TabYou },
];

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
  const pathname = usePathname();
  const index = TABS.findIndex((t) => isActive(t.href, pathname));

  return (
    <nav className="tabbar" aria-label="Bereiche">
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

        {TABS.map(({ href, label, Icon }) => {
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
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
