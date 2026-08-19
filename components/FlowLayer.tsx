"use client";

import { AnimatePresence } from "motion/react";
import { FlowEngine } from "./FlowEngine";
import { FlowRunner } from "./FlowRunner";
import { RunBar } from "./RunBar";
import { useStore } from "@/lib/store";

export function FlowLayer() {
  const run = useStore((s) => s.run);
  const minimized = useStore((s) => s.runMinimized);
  return (
    <>
      {run ? <FlowEngine /> : null}
      <AnimatePresence>
        {run ? minimized ? <RunBar key="bar" /> : <FlowRunner key="runner" /> : null}
      </AnimatePresence>
    </>
  );
}
