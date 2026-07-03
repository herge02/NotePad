"use client";

// Navigation à deux niveaux : groupes (macro-catégories) → sections (onglets).
// Sticky pour rester atteignable au pouce sur iPad.

import { GROUPS, SECTIONS } from "@/lib/formSchema";

export type SectionProgress = "empty" | "started";

export interface SectionTabsProps {
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
  progress: Record<string, SectionProgress>;
}

export default function SectionTabs({ activeSectionId, onSelect, progress }: SectionTabsProps) {
  const activeSection = SECTIONS.find((s) => s.id === activeSectionId);
  const activeGroup = activeSection?.group ?? GROUPS[0].id;
  const groupSections = SECTIONS.filter((s) => s.group === activeGroup);

  const selectGroup = (groupId: string) => {
    const first = SECTIONS.find((s) => s.group === groupId);
    if (first) onSelect(first.id);
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95">
      {/* Niveau 1 : groupes */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto px-2 pt-2">
        {GROUPS.map((g) => {
          const active = g.id === activeGroup;
          const groupStarted = SECTIONS.filter((s) => s.group === g.id).some(
            (s) => progress[s.id] === "started"
          );
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => selectGroup(g.id)}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-t-xl px-4 text-sm font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {g.title}
              <span
                className={`h-2 w-2 rounded-full ${
                  groupStarted ? "bg-green-400" : active ? "bg-white/40" : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              />
            </button>
          );
        })}
      </div>
      {/* Niveau 2 : sections du groupe actif */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto bg-blue-600/10 px-2 py-2 dark:bg-blue-950/40">
        {groupSections.map((s) => {
          const active = s.id === activeSectionId;
          const started = progress[s.id] === "started";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  started
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-white/25 text-white"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                }`}
              >
                {started ? "✓" : s.num}
              </span>
              {s.short}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
