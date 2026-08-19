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

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Bereiche">
      <div className="tabbar-inner">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="tab" data-active={active} onClick={() => haptic("tap")} aria-current={active ? "page" : undefined}>
              <Icon active={active} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
