"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Nav({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <span style={{ flex: 1 }} />
          {right}
        </div>
        <span className="nav-compact">{title}</span>
      </div>
      <h1 className="title-large">{title}</h1>
      {subtitle ? <p className="subtitle">{subtitle}</p> : null}
    </>
  );
}
