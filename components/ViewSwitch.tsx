"use client";

import { haptic } from "@/lib/haptics";

/** Umschalter zwischen zwei Ansichten desselben Tabs.
 *
 *  Er sitzt im below-Slot der Nav, also direkt unter dem Titel — dort liest er
 *  sich als Teil der Überschrift und nicht als weiteres Bedienelement im Inhalt.
 */
export function ViewSwitch<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => {
            if (value === o.value) return;
            onChange(o.value);
            haptic("tap");
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
