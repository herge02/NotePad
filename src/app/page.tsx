"use client";

// Application principale — layout inspiré de SPE-NotePad : barre du haut fixe,
// sidebar de navigation repliable, canevas central où toutes les sections
// s'enchaînent en sections repliables (flow continu), barre de statut en bas.
// État du relevé, autosave IndexedDB, brouillons, mode sombre, export.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import FloorsTable, { totalIncludedArea } from "@/components/FloorsTable";
import FormRenderer from "@/components/FormRenderer";
import PercentageMatrix from "@/components/PercentageMatrix";
import RepeatableList from "@/components/RepeatableList";
import RoomList from "@/components/RoomList";
import Sidebar from "@/components/Sidebar";
import SummarySection from "@/components/SummarySection";
import { btnGhost, btnSubtle } from "@/components/ui";
import type { SectionProgress } from "@/components/types";
import { SECTIONS } from "@/lib/formSchema";
import { sectionStarted } from "@/lib/fieldLogic";
import { exportCSV, exportJSON } from "@/lib/export";
import {
  deleteReleve,
  getActiveId,
  listReleves,
  loadReleve,
  saveReleve,
  setActiveId,
} from "@/lib/storage";
import { uid } from "@/lib/uid";
import type { FieldValue, FormSection, ReleveData, ReleveMeta } from "@/lib/types";

function newReleve(): ReleveData {
  const now = new Date().toISOString();
  return {
    id: uid(),
    reference: "",
    createdAt: now,
    updatedAt: now,
    values: { date_releve: now.slice(0, 10) },
    floors: [],
    rooms: [],
    renovations: [],
    matrices: {},
  };
}

/** identifiant lisible basé sur le numéro de dossier + la date */
function computeReference(releve: ReleveData): string {
  const dossier = (releve.values["no_dossier"] as string) || "sans-dossier";
  const date = (releve.values["date_releve"] as string) || releve.createdAt.slice(0, 10);
  return `${dossier}_${date}`;
}

export default function Home() {
  const [releve, setReleve] = useState<ReleveData | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ dossier: true });
  const [activeSectionId, setActiveSectionId] = useState(SECTIONS[0].id);
  const [drafts, setDrafts] = useState<ReleveMeta[]>([]);
  const [dark, setDark] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktopRef = useRef(true);

  // chargement initial : relevé actif ou nouveau
  useEffect(() => {
    (async () => {
      const activeId = getActiveId();
      const existing = activeId ? await loadReleve(activeId) : undefined;
      const r = existing ?? newReleve();
      setReleve(r);
      setActiveId(r.id);
      setDrafts(await listReleves());
    })();
    const storedDark = localStorage.getItem("releve-dark");
    setDark(
      storedDark !== null ? storedDark === "1" : window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const mq = window.matchMedia("(min-width: 768px)");
    isDesktopRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      isDesktopRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("releve-dark", dark ? "1" : "0");
  }, [dark]);

  // autosave en continu (debounce court, adapté à la saisie terrain)
  const persist = useCallback(async (r: ReleveData) => {
    setSaveState("saving");
    await saveReleve(r);
    setSaveState("saved");
  }, []);

  const applyChange = useCallback(
    (mutate: (prev: ReleveData) => ReleveData) => {
      setReleve((prev) => {
        if (!prev) return prev;
        const next = mutate(prev);
        next.updatedAt = new Date().toISOString();
        next.reference = computeReference(next);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist]
  );

  const updateReleve = useCallback(
    (patch: Partial<ReleveData>) => applyChange((prev) => ({ ...prev, ...patch })),
    [applyChange]
  );

  const setFieldValue = useCallback(
    (fieldId: string, value: FieldValue) =>
      applyChange((prev) => {
        const values = { ...prev.values };
        if (value === undefined) {
          delete values[fieldId];
        } else {
          values[fieldId] = value;
        }
        return { ...prev, values };
      }),
    [applyChange]
  );

  const setMatrixValue = useCallback(
    (matrixId: string, floorId: string, option: string, pct: number | undefined) =>
      applyChange((prev) => {
        const matrices = { ...prev.matrices };
        const perFloor = { ...(matrices[matrixId] ?? {}) };
        const opts = { ...(perFloor[floorId] ?? {}) };
        if (pct === undefined) {
          delete opts[option];
        } else {
          opts[option] = pct;
        }
        perFloor[floorId] = opts;
        matrices[matrixId] = perFloor;
        return { ...prev, matrices };
      }),
    [applyChange]
  );

  const startNew = async () => {
    if (releve && !confirm("Commencer un nouveau relevé ? Le relevé actuel reste sauvegardé en brouillon.")) {
      return;
    }
    if (releve) await persist(releve);
    const r = newReleve();
    setReleve(r);
    setActiveId(r.id);
    setOpenSections({ dossier: true });
    setActiveSectionId(SECTIONS[0].id);
    setDrafts(await listReleves());
    setDraftsOpen(false);
    window.scrollTo({ top: 0 });
  };

  const saveDraft = async () => {
    if (!releve) return;
    await persist(releve);
    setDrafts(await listReleves());
  };

  const openDraft = async (id: string) => {
    const r = await loadReleve(id);
    if (r) {
      setReleve(r);
      setActiveId(r.id);
      setOpenSections({ dossier: true });
      window.scrollTo({ top: 0 });
    }
    setDraftsOpen(false);
  };

  const removeDraft = async (id: string) => {
    if (!confirm("Supprimer définitivement ce brouillon ?")) return;
    await deleteReleve(id);
    setDrafts(await listReleves());
    if (releve?.id === id) {
      const r = newReleve();
      setReleve(r);
      setActiveId(r.id);
    }
  };

  const selectSection = (id: string) => {
    setActiveSectionId(id);
    setOpenSections((prev) => ({ ...prev, [id]: true }));
    setMobileSidebarOpen(false);
    // laisse la section s'ouvrir avant de défiler
    requestAnimationFrame(() => {
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleMenu = () => {
    if (isDesktopRef.current) {
      setDesktopSidebarExpanded((v) => !v);
    } else {
      setMobileSidebarOpen((v) => !v);
    }
  };

  const progress = useMemo<Record<string, SectionProgress>>(() => {
    const map: Record<string, SectionProgress> = {};
    if (releve) {
      for (const s of SECTIONS) {
        map[s.id] = sectionStarted(s, releve) ? "started" : "empty";
      }
    }
    return map;
  }, [releve]);

  if (!releve) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Chargement du relevé…
      </main>
    );
  }

  const renderSection = (section: FormSection) => {
    switch (section.special) {
      case "floors":
        return (
          <div className="space-y-5">
            {section.fields && (
              <FormRenderer fields={section.fields} values={releve.values} onChange={setFieldValue} />
            )}
            <FloorsTable floors={releve.floors} onChange={(floors) => updateReleve({ floors })} />
          </div>
        );
      case "rooms":
        return (
          <RoomList rooms={releve.rooms} floors={releve.floors} onChange={(rooms) => updateReleve({ rooms })} />
        );
      case "renovations":
        return (
          <RepeatableList
            renovations={releve.renovations}
            onChange={(renovations) => updateReleve({ renovations })}
          />
        );
      case "summary":
        return <SummarySection releve={releve} />;
      default:
        return (
          <div className="space-y-5">
            {section.fields && (
              <FormRenderer fields={section.fields} values={releve.values} onChange={setFieldValue} />
            )}
            {section.matrices?.map((matrix) => (
              <PercentageMatrix
                key={matrix.id}
                matrix={matrix}
                floors={releve.floors}
                values={releve.matrices[matrix.id] ?? {}}
                onChange={(floorId, option, pct) => setMatrixValue(matrix.id, floorId, option, pct)}
              />
            ))}
          </div>
        );
    }
  };

  const totalArea = totalIncludedArea(releve.floors);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Barre du haut fixe */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-slate-900/10 bg-white/90 backdrop-blur dark:border-slate-100/10 dark:bg-slate-900/90">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-3">
          <button type="button" className={btnGhost} onClick={toggleMenu} aria-label="Ouvrir le menu">
            ☰ Menu
          </button>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Relevé de bâtiment</span>
            <span className="ml-2 hidden truncate text-xs text-slate-400 sm:inline">
              {releve.reference || "nouveau"}
            </span>
          </div>
          <span
            className={`hidden text-xs sm:inline ${saveState === "saved" ? "text-green-600" : "text-slate-400"}`}
          >
            {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "✓ Sauvegardé" : ""}
          </span>
          <button type="button" className={btnSubtle} onClick={startNew}>
            Nouveau
          </button>
          <button type="button" className={btnSubtle} onClick={saveDraft}>
            Brouillon
          </button>
          <div className="relative">
            <button type="button" className={btnSubtle} onClick={() => setDraftsOpen(!draftsOpen)} aria-expanded={draftsOpen}>
              Relevés ({drafts.length})
            </button>
            {draftsOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-[min(360px,90vw)] rounded-md border border-slate-900/10 bg-white p-2 shadow-lg dark:border-slate-100/10 dark:bg-slate-900">
                {drafts.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-slate-500">Aucun brouillon sauvegardé.</p>
                ) : (
                  <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                    {drafts.map((d) => (
                      <li key={d.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDraft(d.id)}
                          className={`min-h-[40px] flex-1 truncate rounded-md px-2 text-left text-sm ${
                            d.id === releve.id
                              ? "bg-slate-900/5 font-medium text-slate-900 dark:bg-slate-100/10 dark:text-slate-100"
                              : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-300"
                          }`}
                        >
                          {d.reference || "sans référence"}
                          <span className="ml-2 text-xs text-slate-400">
                            {new Date(d.updatedAt).toLocaleDateString("fr-CA")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDraft(d.id)}
                          className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          aria-label="Supprimer ce brouillon"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-1 flex gap-1 border-t border-slate-100 pt-1 dark:border-slate-800">
                  <button type="button" className={btnGhost} onClick={() => exportJSON(releve)}>
                    Exporter JSON
                  </button>
                  <button type="button" className={btnGhost} onClick={() => exportCSV(releve)}>
                    Exporter CSV
                  </button>
                </div>
              </div>
            )}
          </div>
          <button type="button" className={btnGhost} onClick={() => setDark(!dark)} aria-label="Basculer le mode sombre">
            {dark ? "☀︎" : "☾"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-6xl pt-14">
        <Sidebar
          open={mobileSidebarOpen}
          desktopExpanded={desktopSidebarExpanded}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          activeSectionId={activeSectionId}
          onSelectSection={selectSection}
          progress={progress}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-2 p-3 md:p-5">
            {SECTIONS.map((section) => (
              <div key={section.id} id={`section-${section.id}`} style={{ scrollMarginTop: 64 }}>
                <CollapsibleSection
                  title={`${section.num}. ${section.title}`}
                  open={openSections[section.id] === true}
                  started={progress[section.id] === "started"}
                  onToggle={() => {
                    setActiveSectionId(section.id);
                    setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }));
                  }}
                >
                  {renderSection(section)}
                </CollapsibleSection>
              </div>
            ))}
          </div>

          {/* Barre de statut */}
          <div className="sticky bottom-0 border-t border-slate-900/10 bg-white/95 px-4 py-2 text-xs text-slate-600 backdrop-blur dark:border-slate-100/10 dark:bg-slate-900/95 dark:text-slate-300">
            <span className={saveState === "saved" ? "text-green-600" : ""}>
              {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "✓ Sauvegardé" : "—"}
            </span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            Aire totale : {totalArea.toLocaleString("fr-CA")} pi²
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            {releve.rooms.length} pièce{releve.rooms.length > 1 ? "s" : ""}
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            {releve.reference || "nouveau relevé"}
          </div>
        </main>
      </div>
    </div>
  );
}
