"use client";

// Application principale : état du relevé, autosave IndexedDB, navigation
// deux niveaux, gestion des brouillons, mode sombre, export.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FloorsTable from "@/components/FloorsTable";
import FormRenderer from "@/components/FormRenderer";
import PercentageMatrix from "@/components/PercentageMatrix";
import RepeatableList from "@/components/RepeatableList";
import RoomList from "@/components/RoomList";
import SectionTabs, { type SectionProgress } from "@/components/SectionTabs";
import SummarySection from "@/components/SummarySection";
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
import type { FieldValue, ReleveData, ReleveMeta } from "@/lib/types";

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

const headerBtn =
  "min-h-[44px] rounded-xl px-3.5 text-sm font-semibold transition-colors " +
  "border border-neutral-300 bg-white text-neutral-700 " +
  "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200";

export default function Home() {
  const [releve, setReleve] = useState<ReleveData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState(SECTIONS[0].id);
  const [drafts, setDrafts] = useState<ReleveMeta[]>([]);
  const [dark, setDark] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const prefersDark =
      storedDark !== null
        ? storedDark === "1"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
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

  const updateReleve = useCallback(
    (patch: Partial<ReleveData>) => {
      setReleve((prev) => {
        if (!prev) return prev;
        const next: ReleveData = { ...prev, ...patch, updatedAt: new Date().toISOString() };
        next.reference = computeReference(next);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist]
  );

  const setFieldValue = useCallback(
    (fieldId: string, value: FieldValue) => {
      setReleve((prev) => {
        if (!prev) return prev;
        const values = { ...prev.values };
        if (value === undefined) {
          delete values[fieldId];
        } else {
          values[fieldId] = value;
        }
        const next: ReleveData = { ...prev, values, updatedAt: new Date().toISOString() };
        next.reference = computeReference(next);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist]
  );

  const setMatrixValue = useCallback(
    (matrixId: string, floorId: string, option: string, pct: number | undefined) => {
      setReleve((prev) => {
        if (!prev) return prev;
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
        const next: ReleveData = { ...prev, matrices, updatedAt: new Date().toISOString() };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 500);
        return next;
      });
    },
    [persist]
  );

  const startNew = async () => {
    if (releve && !confirm("Commencer un nouveau relevé ? Le relevé actuel reste sauvegardé en brouillon.")) {
      return;
    }
    if (releve) await persist(releve);
    const r = newReleve();
    setReleve(r);
    setActiveId(r.id);
    setActiveSectionId(SECTIONS[0].id);
    setDrafts(await listReleves());
    setMenuOpen(false);
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
      setActiveSectionId(SECTIONS[0].id);
    }
    setMenuOpen(false);
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

  const progress = useMemo<Record<string, SectionProgress>>(() => {
    const map: Record<string, SectionProgress> = {};
    if (releve) {
      for (const s of SECTIONS) {
        map[s.id] = sectionStarted(s, releve) ? "started" : "empty";
      }
    }
    return map;
  }, [releve]);

  const section = SECTIONS.find((s) => s.id === activeSectionId) ?? SECTIONS[0];

  if (!releve) {
    return (
      <main className="flex min-h-screen items-center justify-center text-neutral-500">
        Chargement du relevé…
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* En-tête : actions principales */}
      <header className="border-b border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-base font-bold text-neutral-800 dark:text-neutral-100">
            Relevé de bâtiment
            <span className="ml-2 text-sm font-normal text-neutral-400">
              {releve.reference || "nouveau"}
            </span>
          </h1>
          <span
            className={`text-xs ${
              saveState === "saved" ? "text-green-600" : "text-neutral-400"
            }`}
          >
            {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "✓ Sauvegardé" : ""}
          </span>
          <button type="button" className={headerBtn} onClick={startNew}>
            Nouveau relevé
          </button>
          <button type="button" className={headerBtn} onClick={saveDraft}>
            Sauvegarder brouillon
          </button>
          <button type="button" className={headerBtn} onClick={() => exportJSON(releve)}>
            Exporter JSON
          </button>
          <button type="button" className={headerBtn} onClick={() => exportCSV(releve)}>
            Exporter CSV
          </button>
          <button
            type="button"
            className={headerBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
          >
            Brouillons ({drafts.length})
          </button>
          <button
            type="button"
            className={headerBtn}
            onClick={() => setDark(!dark)}
            aria-label="Basculer le mode sombre"
          >
            {dark ? "☀︎" : "☾"}
          </button>
        </div>

        {menuOpen && (
          <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
            {drafts.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun brouillon sauvegardé.</p>
            ) : (
              <ul className="space-y-1.5">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDraft(d.id)}
                      className={`min-h-[44px] flex-1 rounded-xl border px-3 text-left text-sm ${
                        d.id === releve.id
                          ? "border-blue-500 bg-blue-50 font-semibold dark:bg-blue-950"
                          : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
                      }`}
                    >
                      {d.reference || "sans référence"}
                      <span className="ml-2 text-xs text-neutral-400">
                        {new Date(d.updatedAt).toLocaleString("fr-CA")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDraft(d.id)}
                      className="min-h-[44px] rounded-xl border border-red-300 px-3 text-sm text-red-600 dark:border-red-800"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      {/* Navigation deux niveaux, sticky */}
      <SectionTabs activeSectionId={activeSectionId} onSelect={setActiveSectionId} progress={progress} />

      {/* Contenu de la section active */}
      <div className="mx-auto max-w-4xl space-y-6 px-3 py-4">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          {section.num}. {section.title}
        </h2>

        {section.special === "floors" && (
          <>
            {section.fields && (
              <FormRenderer fields={section.fields} values={releve.values} onChange={setFieldValue} />
            )}
            <FloorsTable floors={releve.floors} onChange={(floors) => updateReleve({ floors })} />
          </>
        )}

        {section.special === "rooms" && (
          <RoomList
            rooms={releve.rooms}
            floors={releve.floors}
            onChange={(rooms) => updateReleve({ rooms })}
          />
        )}

        {section.special === "renovations" && (
          <RepeatableList
            renovations={releve.renovations}
            onChange={(renovations) => updateReleve({ renovations })}
          />
        )}

        {section.special === "summary" && <SummarySection releve={releve} />}

        {!section.special && (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}
