"use client";

// Sidebar de navigation (style SPE-NotePad) : groupes en intertitres, sections
// en liens avec pastille de progression. Repliable sur desktop, en overlay sur
// tablette portrait / mobile.

import { GROUPS, SECTIONS } from "@/lib/formSchema";
import type { SectionProgress } from "./types";

type Props = {
  open: boolean;
  desktopExpanded: boolean;
  onCloseMobile: () => void;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  progress: Record<string, SectionProgress>;
};

export default function Sidebar({
  open,
  desktopExpanded,
  onCloseMobile,
  activeSectionId,
  onSelectSection,
  progress,
}: Props) {
  return (
    <>
      {/* Overlay mobile / portrait */}
      <button
        type="button"
        className={`fixed inset-0 z-30 bg-slate-900/20 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Fermer le menu"
        onClick={onCloseMobile}
      />

      <aside
        className={
          "fixed inset-y-0 left-0 z-40 w-[280px] -translate-x-full border-r border-slate-900/10 bg-white " +
          "transition-transform duration-200 dark:border-slate-100/10 dark:bg-slate-900 " +
          "md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:translate-x-0 md:self-start " +
          "md:transition-[width,opacity] md:duration-200 " +
          `${desktopExpanded ? "md:w-[280px] md:opacity-100" : "md:w-0 md:overflow-hidden md:border-r-0 md:opacity-0"} ` +
          `${open ? "translate-x-0" : ""}`
        }
        aria-label="Navigation"
      >
        <div className="flex h-full flex-col pt-14 md:pt-0">
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-4">
              {GROUPS.map((group) => (
                <div key={group.id}>
                  <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.title}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {SECTIONS.filter((s) => s.group === group.id).map((s) => {
                      const active = s.id === activeSectionId;
                      const started = progress[s.id] === "started";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onSelectSection(s.id)}
                          aria-current={active ? "true" : undefined}
                          className={
                            "flex min-h-[40px] w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
                            (active
                              ? "bg-slate-900/5 font-medium text-slate-900 dark:bg-slate-100/10 dark:text-slate-100"
                              : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-slate-100/10")
                          }
                        >
                          <span className="w-5 text-right text-xs tabular-nums text-slate-400">{s.num}</span>
                          <span className="flex-1 truncate">{s.short}</span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              started ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
          <div className="border-t border-slate-900/10 p-3 text-xs text-slate-500 dark:border-slate-100/10">
            On documente les faits — jamais l'état des composantes.
          </div>
        </div>
      </aside>
    </>
  );
}
