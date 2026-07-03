"use client";

// Stepper des 5 phases — repérage permanent : où je suis, ce qui est complet.

import { PHASES } from "@/lib/formSchema";
import type { ModuleStatus, Phase } from "@/lib/types";

export default function PhaseStepper({
  activePhase,
  statuses,
  onSelect,
}: {
  activePhase: Phase;
  statuses: Record<Phase, ModuleStatus>;
  onSelect: (phase: Phase) => void;
}) {
  return (
    <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-slate-900/10 bg-white px-2 py-1.5 dark:border-slate-100/10 dark:bg-slate-900">
      {PHASES.map((p) => {
        const active = p.id === activePhase;
        const st = statuses[p.id];
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
              active
                ? "bg-blue-600 font-semibold text-white"
                : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-slate-100/10"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                st === "done"
                  ? "bg-green-500 text-white"
                  : active
                    ? "bg-white/25 text-white"
                    : st === "in-progress"
                      ? "bg-amber-400 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {st === "done" ? "✓" : p.id}
            </span>
            {p.short}
          </button>
        );
      })}
    </div>
  );
}
