"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { TabFlow, TabGoals, TabStats, TabSystem, TabToday } from "./Icons";

const TABS = [
  { href: "/", label: "Heute", Icon: TabToday },
  { href: "/flow", label: "Flow", Icon: TabFlow },
  { href: "/system", label: "System", Icon: TabSystem },
  { href: "/goals", label: "Ziele", Icon: TabGoals },
  { href: "/stats", label: "Stats", Icon: TabStats },
];

const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function TabBar() {
  const pathname = usePathname();
  const index = TABS.findIndex((t) => isActive(t.href, pathname));

  return (
    <nav className="tabbar" aria-label="Bereiche">
      <div className="tabbar-inner">
        {/* Eine Pille für alle Tabs: sie ist genau einen Tab breit und wandert
            per Transform um ihre eigene Breite. Die Federung macht die
            CSS-Transition — motion diffte die Prozentwerte nicht zuverlässig,
            und für eine reine Verschiebung braucht es keine Animations-Engine. */}
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
