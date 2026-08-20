"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hydrated } from "@/components/Hydrated";
import { ViewSwitch } from "@/components/ViewSwitch";
import { useT } from "@/lib/i18n";
import { SettingsView } from "@/components/views/SettingsView";
import { SystemView } from "@/components/views/SystemView";

type Tab = "konto" | "routinen";

export default function DuPage() {
  return (
    <Hydrated>
      <Suspense fallback={null}>
        <Du />
      </Suspense>
    </Hydrated>
  );
}

/** Alles, was dir gehört und selten angefasst wird: Profil, Konto, Daten,
 *  Erinnerungen — und der Routinen-Editor, der bisher als eigener Tab lief,
 *  obwohl man ihn nach dem Einrichten kaum noch öffnet. */
function Du() {
  const t = useT();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("t") === "routinen" ? "routinen" : "konto");

  const change = (next: Tab) => {
    setTab(next);
    window.history.replaceState({}, "", next === "routinen" ? "/du?t=routinen" : "/du");
  };

  const switcher = (
    <ViewSwitch
      value={tab}
      label={t.you.switchLabel}
      onChange={change}
      options={[
        { value: "konto", label: t.you.account },
        { value: "routinen", label: t.you.routines },
      ]}
    />
  );

  return tab === "konto" ? <SettingsView below={switcher} /> : <SystemView below={switcher} />;
}
