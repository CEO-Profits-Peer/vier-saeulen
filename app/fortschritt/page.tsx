"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hydrated } from "@/components/Hydrated";
import { ViewSwitch } from "@/components/ViewSwitch";
import { GoalsView } from "@/components/views/GoalsView";
import { StatsView } from "@/components/views/StatsView";

type Tab = "ziele" | "stats";

export default function FortschrittPage() {
  return (
    <Hydrated>
      <Suspense fallback={null}>
        <Fortschritt />
      </Suspense>
    </Hydrated>
  );
}

/** Ziele und Stats beantworten dieselbe Frage — wie läuft es über Zeit? —
 *  und teilen sich deshalb einen Tab. Der Umschalter steht in der URL, damit
 *  Verknüpfungen und der Zurück-Knopf auf der richtigen Hälfte landen. */
function Fortschritt() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("t") === "stats" ? "stats" : "ziele");

  const change = (next: Tab) => {
    setTab(next);
    window.history.replaceState({}, "", next === "stats" ? "/fortschritt?t=stats" : "/fortschritt");
  };

  const switcher = (
    <ViewSwitch
      value={tab}
      label="Ziele oder Stats"
      onChange={change}
      options={[
        { value: "ziele", label: "Ziele" },
        { value: "stats", label: "Stats" },
      ]}
    />
  );

  return tab === "ziele" ? <GoalsView below={switcher} /> : <StatsView below={switcher} />;
}
