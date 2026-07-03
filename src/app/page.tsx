"use client";

// Application principale — flux guidé : Mes relevés → hub de phases/modules →
// écrans de saisie focalisés (une tâche à la fois) → vérification & export.
// Autosave IndexedDB, hors ligne, mode sombre.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModuleHub from "@/components/ModuleHub";
import ModuleScreen from "@/components/ModuleScreen";
import PhaseStepper from "@/components/PhaseStepper";
import ReleveList from "@/components/ReleveList";
import { btnGhost } from "@/components/ui";
import { MODULES, PHASES, getModule } from "@/lib/formSchema";
import {
  moduleStatus,
  navigableModules,
  phaseStatus,
} from "@/lib/fieldLogic";
import { getLast } from "@/lib/lastUsed";
import {
  deleteReleve,
  getActiveId,
  listRelevesFull,
  loadReleve,
  saveReleve,
  setActiveId,
} from "@/lib/storage";
import { uid } from "@/lib/uid";
import type { FieldValue, ModuleDef, Phase, ReleveData } from "@/lib/types";

function newReleve(): ReleveData {
  const now = new Date().toISOString();
  const values: Record<string, FieldValue> = { date_releve: now.slice(0, 10) };
  // préremplissage « dernier choix utilisé »
  for (const m of MODULES) {
    for (const f of m.fields ?? []) {
      if (f.rememberLast) {
        const last = getLast(f.id);
        if (last) values[f.id] = last;
      }
    }
  }
  return {
    id: uid(),
    reference: "",
    createdAt: now,
    updatedAt: now,
    values,
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

type View = { kind: "list" } | { kind: "hub" } | { kind: "module"; id: string };

export default function Home() {
  const [releve, setReleve] = useState<ReleveData | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [activePhase, setActivePhase] = useState<Phase>(1);
  const [allReleves, setAllReleves] = useState<ReleveData[]>([]);
  const [dark, setDark] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // chargement initial : reprendre le relevé actif, sinon la liste
  useEffect(() => {
    (async () => {
      const activeId = getActiveId();
      const existing = activeId ? await loadReleve(activeId) : undefined;
      if (existing) {
        setReleve(existing);
        setView({ kind: "hub" });
      }
      setAllReleves(await listRelevesFull());
      setLoaded(true);
    })();
    const storedDark = localStorage.getItem("releve-dark");
    setDark(
      storedDark !== null ? storedDark === "1" : window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("releve-dark", dark ? "1" : "0");
  }, [dark]);

  // autosave en continu (debounce court)
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

  const setMatrixFloor = useCallback(
    (matrixId: string, floorId: string, vals: Record<string, number>) =>
      applyChange((prev) => {
        const matrices = { ...prev.matrices };
        const perFloor = { ...(matrices[matrixId] ?? {}) };
        perFloor[floorId] = vals;
        matrices[matrixId] = perFloor;
        return { ...prev, matrices };
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

  // --- gestion des relevés --------------------------------------------------
  const refreshList = useCallback(async () => setAllReleves(await listRelevesFull()), []);

  const openReleve = async (id: string) => {
    const r = await loadReleve(id);
    if (r) {
      setReleve(r);
      setActiveId(r.id);
      setActivePhase(1);
      setView({ kind: "hub" });
    }
  };

  const startNew = async () => {
    if (releve) await persist(releve);
    const r = newReleve();
    setReleve(r);
    setActiveId(r.id);
    setActivePhase(1);
    // droit à la première tâche : identifier le dossier
    setView({ kind: "module", id: "identification" });
    await persist(r);
    await refreshList();
  };

  const duplicateReleve = async (id: string) => {
    const src = await loadReleve(id);
    if (!src) return;
    const now = new Date().toISOString();
    const copy: ReleveData = {
      ...structuredClone(src),
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    delete copy.values["no_dossier"];
    copy.values["date_releve"] = now.slice(0, 10);
    copy.reference = computeReference(copy);
    await saveReleve(copy);
    await refreshList();
  };

  const removeReleve = async (id: string) => {
    if (!confirm("Supprimer définitivement ce relevé ?")) return;
    await deleteReleve(id);
    if (releve?.id === id) {
      setReleve(null);
      setView({ kind: "list" });
    }
    await refreshList();
  };

  const backToList = async () => {
    if (releve) await persist(releve);
    await refreshList();
    setView({ kind: "list" });
  };

  // --- navigation entre modules ----------------------------------------------
  const goto = (target: string) => {
    if (target.startsWith("hub:")) {
      setActivePhase(Number(target.slice(4)) as Phase);
      setView({ kind: "hub" });
      window.scrollTo({ top: 0 });
      return;
    }
    const m = getModule(target);
    if (m) {
      setActivePhase(m.phase);
      setView({ kind: "module", id: m.id });
      window.scrollTo({ top: 0 });
    }
  };

  const openModule = (m: ModuleDef) => {
    // ouvrir un opt-in vaut réponse « oui »
    if (m.optIn && releve && releve.values[m.optIn.fieldId] !== "oui") {
      setFieldValue(m.optIn.fieldId, "oui");
    }
    goto(m.id);
  };

  const answerOptIn = (m: ModuleDef, answer: "oui" | "non") => {
    setFieldValue(m.optIn!.fieldId, answer);
    if (answer === "oui") goto(m.id);
  };

  const reactivate = (m: ModuleDef) => {
    if (m.optIn) {
      setFieldValue(m.optIn.fieldId, "oui");
    } else {
      setFieldValue(`module_force_${m.id}`, "oui");
    }
    setFieldValue(`module_na_${m.id}`, undefined);
    goto(m.id);
  };

  const phaseStatuses = useMemo(() => {
    const map = {} as Record<Phase, ReturnType<typeof phaseStatus>>;
    if (releve) {
      for (const p of PHASES) map[p.id] = phaseStatus(p.id, releve);
    }
    return map;
  }, [releve]);

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Chargement…
      </main>
    );
  }

  // --- Écran 0 : Mes relevés --------------------------------------------------
  if (view.kind === "list" || !releve) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-slate-900/10 bg-white/90 px-3 backdrop-blur dark:border-slate-100/10 dark:bg-slate-900/90">
          <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Relevé de bâtiment — Mes relevés
          </span>
          <button type="button" className={btnGhost} onClick={() => setDark(!dark)} aria-label="Basculer le mode sombre">
            {dark ? "☀︎" : "☾"}
          </button>
        </header>
        <ReleveList
          releves={allReleves}
          onOpen={openReleve}
          onNew={startNew}
          onDuplicate={duplicateReleve}
          onDelete={removeReleve}
        />
      </div>
    );
  }

  // --- Coquille du relevé : topbar + stepper + contenu -------------------------
  const currentModule = view.kind === "module" ? getModule(view.id) : undefined;
  const nav = navigableModules(releve);
  const idx = currentModule ? nav.findIndex((m) => m.id === currentModule.id) : -1;
  const prevModule = idx > 0 ? nav[idx - 1] : undefined;
  const nextModule = idx >= 0 && idx < nav.length - 1 ? nav[idx + 1] : undefined;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/90 backdrop-blur dark:border-slate-100/10 dark:bg-slate-900/90">
        <div className="flex h-12 items-center gap-2 px-2">
          <button type="button" className={btnGhost} onClick={backToList}>
            ‹ Mes relevés
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-900 dark:text-slate-100"
            onClick={() => setView({ kind: "hub" })}
          >
            {releve.reference || "Nouveau relevé"}
            {view.kind === "module" && currentModule && (
              <span className="ml-2 font-normal text-slate-400">· {currentModule.short}</span>
            )}
          </button>
          <span className={`text-xs ${saveState === "saved" ? "text-green-600" : "text-slate-400"}`}>
            {saveState === "saving" ? "…" : saveState === "saved" ? "✓" : ""}
          </span>
          <button type="button" className={btnGhost} onClick={() => setDark(!dark)} aria-label="Basculer le mode sombre">
            {dark ? "☀︎" : "☾"}
          </button>
        </div>
        <PhaseStepper
          activePhase={activePhase}
          statuses={phaseStatuses}
          onSelect={(p) => {
            setActivePhase(p);
            setView({ kind: "hub" });
          }}
        />
      </header>

      {view.kind === "hub" && (
        <main className="mx-auto max-w-2xl p-3 md:p-5">
          <ModuleHub
            phase={activePhase}
            releve={releve}
            onOpen={(id) => {
              const m = getModule(id);
              if (m) openModule(m);
            }}
            onAnswerOptIn={answerOptIn}
            onReactivate={reactivate}
          />
        </main>
      )}

      {view.kind === "module" && currentModule && (
        <main className="mx-auto max-w-3xl">
          <ModuleScreen
            module={currentModule}
            releve={releve}
            setFieldValue={setFieldValue}
            updateReleve={updateReleve}
            setMatrixValue={setMatrixValue}
            setMatrixFloor={setMatrixFloor}
            saveState={saveState}
            prevLabel={prevModule ? prevModule.short : "Accueil"}
            nextLabel={
              nextModule
                ? moduleStatus(nextModule, releve) === "todo"
                  ? nextModule.short
                  : nextModule.short
                : "Accueil"
            }
            onPrev={() => (prevModule ? goto(prevModule.id) : goto(`hub:${currentModule.phase}`))}
            onNext={() => (nextModule ? goto(nextModule.id) : goto(`hub:${currentModule.phase}`))}
            review={{
              onGoto: goto,
              onMarkNa: (id) => setFieldValue(`module_na_${id}`, "oui"),
            }}
          />
        </main>
      )}
    </div>
  );
}
