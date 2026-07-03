// Logique pure : visibilité conditionnelle, remplissage, statuts de modules,
// anomalies, prochaine tâche, totaux. Partagée entre rendu, hub, stepper et
// écran de vérification.

import { MODULES, PHASES } from "./formSchema";
import type {
  FieldValue,
  FloorData,
  FormField,
  ModuleDef,
  ModuleStatus,
  Phase,
  QuantityItem,
  ReleveData,
  ShowIf,
} from "./types";

// ---------------------------------------------------------------------------
// Visibilité / remplissage des champs
// ---------------------------------------------------------------------------

export function matchShowIf(cond: ShowIf, values: Record<string, FieldValue>): boolean {
  const v = values[cond.field];
  if (cond.equals !== undefined) return v === cond.equals;
  if (cond.includes !== undefined) {
    if (Array.isArray(v)) return v.includes(cond.includes);
    return typeof v === "string" && v === cond.includes;
  }
  if (cond.in !== undefined) return cond.in.includes(v as unknown);
  if (cond.notIn !== undefined) return !cond.notIn.includes(v as unknown);
  if (cond.truthy) {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "" && v !== false && v !== 0;
  }
  return true;
}

export function isVisible(field: FormField, values: Record<string, FieldValue>): boolean {
  return field.showIf ? matchShowIf(field.showIf, values) : true;
}

/** un champ est-il « rempli » ? */
export function isFilled(value: FieldValue): boolean {
  if (value === undefined || value === null || value === "" || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.values(obj).some((v) => {
      if (v && typeof v === "object") return (v as QuantityItem).checked || isFilled(v as FieldValue);
      return v !== undefined && v !== null && v !== "" && v !== false;
    });
  }
  return true;
}

export function percentageSum(value: Record<string, number> | undefined): number {
  if (!value) return 0;
  return Object.values(value).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

// ---------------------------------------------------------------------------
// Totaux
// ---------------------------------------------------------------------------

export function totalIncludedArea(floors: FloorData[]): number {
  return floors.filter((f) => f.included).reduce((acc, f) => acc + (Number(f.area) || 0), 0);
}

export function mezzanineArea(floors: FloorData[]): number {
  return floors.filter((f) => f.type === "Mezzanine").reduce((acc, f) => acc + (Number(f.area) || 0), 0);
}

// ---------------------------------------------------------------------------
// Modules : démarrage, anomalies, statut, résumé
// ---------------------------------------------------------------------------

const forceKey = (id: string) => `module_force_${id}`;
const naKey = (id: string) => `module_na_${id}`;

/** le module contient-il au moins une donnée saisie ? */
export function moduleStarted(m: ModuleDef, r: ReleveData): boolean {
  if (m.special === "rooms") return r.rooms.length > 0;
  if (m.special === "renovations") return r.renovations.length > 0;
  if (m.special === "summary") return false;
  if (m.special === "floors" && r.floors.length > 0) return true;
  if ((m.fields ?? []).some((f) => isFilled(r.values[f.id]))) return true;
  return (m.matrices ?? []).some((mx) =>
    Object.values(r.matrices[mx.id] ?? {}).some((perFloor) => Object.keys(perFloor).length > 0)
  );
}

export interface Anomaly {
  moduleId: string;
  message: string;
}

/** anomalies de pourcentage (> 100 %) du module */
export function moduleAnomalies(m: ModuleDef, r: ReleveData): Anomaly[] {
  const out: Anomaly[] = [];
  for (const mx of m.matrices ?? []) {
    for (const [floorId, opts] of Object.entries(r.matrices[mx.id] ?? {})) {
      const sum = Object.values(opts).reduce((acc, v) => acc + (Number(v) || 0), 0);
      if (sum > 100) {
        const floorLabel = r.floors.find((f) => f.id === floorId)?.label ?? floorId;
        out.push({ moduleId: m.id, message: `${mx.title} — ${floorLabel} : ${sum} %` });
      }
    }
  }
  for (const f of m.fields ?? []) {
    if (f.type === "percentage-group") {
      const sum = percentageSum(r.values[f.id] as Record<string, number> | undefined);
      if (sum > 100) out.push({ moduleId: m.id, message: `${f.label} : ${sum} %` });
    }
  }
  if (m.id === "superstructure") {
    const roof =
      (Number(r.values["toiture_pente_pct"]) || 0) + (Number(r.values["toiture_plate_pct"]) || 0);
    if (roof > 100) out.push({ moduleId: m.id, message: `Toiture (pente + plate) : ${roof} %` });
  }
  return out;
}

export function allAnomalies(r: ReleveData): Anomaly[] {
  return MODULES.flatMap((m) => moduleAnomalies(m, r));
}

/** champs requis visibles et non remplis du module */
export function missingRequired(m: ModuleDef, r: ReleveData): FormField[] {
  return (m.fields ?? []).filter(
    (f) => f.required && isVisible(f, r.values) && !isFilled(r.values[f.id])
  );
}

export function moduleStatus(m: ModuleDef, r: ReleveData): ModuleStatus {
  if (r.values[naKey(m.id)] === "oui") return "na";
  if (m.visibleWhen && !matchShowIf(m.visibleWhen, r.values) && r.values[forceKey(m.id)] !== "oui") {
    return "na";
  }
  const started = moduleStarted(m, r);
  if (m.optIn) {
    const ans = r.values[m.optIn.fieldId];
    if (ans === "non") return "na";
    if (ans !== "oui" && !started) return "todo";
  }
  if (m.special === "summary") return "todo";
  if (moduleAnomalies(m, r).length > 0) return "in-progress";
  if (m.special === "rooms") return r.rooms.length > 0 ? "done" : "todo";
  if (m.special === "renovations") return r.renovations.length > 0 ? "done" : "todo";
  if (m.special === "floors") {
    if (r.floors.length === 0) return started ? "in-progress" : "todo";
    return r.floors.every((f) => !f.included || f.area !== undefined) ? "done" : "in-progress";
  }
  const reqs = (m.fields ?? []).filter((f) => f.required && isVisible(f, r.values));
  if (reqs.length > 0) {
    if (reqs.every((f) => isFilled(r.values[f.id]))) return "done";
    return started ? "in-progress" : "todo";
  }
  return started ? "done" : "todo";
}

/** un module opt-in dont la question n'est pas encore répondue (et vide) */
export function isUnansweredOptIn(m: ModuleDef, r: ReleveData): boolean {
  if (!m.optIn) return false;
  const ans = r.values[m.optIn.fieldId];
  return ans !== "oui" && ans !== "non" && !moduleStarted(m, r);
}

/** compte champs remplis / visibles (essential + detail) pour la carte */
export function moduleCounts(m: ModuleDef, r: ReleveData): { filled: number; total: number } {
  const fields = (m.fields ?? []).filter(
    (f) => f.tier !== "advanced" && isVisible(f, r.values) && !f.id.endsWith("__autre")
  );
  return {
    filled: fields.filter((f) => isFilled(r.values[f.id])).length,
    total: fields.length,
  };
}

/** sous-texte d'une ligne pour la carte du module */
export function moduleSummary(m: ModuleDef, r: ReleveData): string {
  if (m.special === "floors") {
    if (r.floors.length === 0) return "";
    const total = totalIncludedArea(r.floors);
    return `${r.floors.length} étage${r.floors.length > 1 ? "s" : ""}${
      total > 0 ? ` · ${total.toLocaleString("fr-CA")} pi²` : ""
    }`;
  }
  if (m.special === "rooms") {
    return r.rooms.length > 0 ? `${r.rooms.length} pièce${r.rooms.length > 1 ? "s" : ""}` : "";
  }
  if (m.special === "renovations") {
    return r.renovations.length > 0
      ? `${r.renovations.length} rénovation${r.renovations.length > 1 ? "s" : ""}`
      : "";
  }
  if (m.special === "summary") return "";
  const matrixFloors = (m.matrices ?? []).reduce(
    (acc, mx) =>
      acc +
      Object.values(r.matrices[mx.id] ?? {}).filter((per) => Object.keys(per).length > 0).length,
    0
  );
  const { filled, total } = moduleCounts(m, r);
  const parts: string[] = [];
  if (filled > 0) parts.push(`${filled}/${total} champs`);
  if (matrixFloors > 0) parts.push(`${matrixFloors} matrice${matrixFloors > 1 ? "s" : ""}·étage`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Navigation : modules visibles ordonnés, prochaine tâche, statut de phase
// ---------------------------------------------------------------------------

/** modules navigables (statut ≠ na, questions opt-in répondues « oui » ou démarrées) */
export function navigableModules(r: ReleveData): ModuleDef[] {
  return MODULES.filter((m) => {
    const st = moduleStatus(m, r);
    if (st === "na") return false;
    if (isUnansweredOptIn(m, r)) return false;
    return true;
  });
}

/** prochaine tâche utile : premier module todo / in-progress (hors vérification) */
export function nextTask(r: ReleveData): ModuleDef | undefined {
  return navigableModules(r).find(
    (m) => m.special !== "summary" && ["todo", "in-progress"].includes(moduleStatus(m, r))
  );
}

export function phaseStatus(phase: Phase, r: ReleveData): ModuleStatus {
  const mods = MODULES.filter(
    (m) => m.phase === phase && m.special !== "summary" && moduleStatus(m, r) !== "na" && !isUnansweredOptIn(m, r)
  );
  if (mods.length === 0) return "done";
  if (mods.every((m) => moduleStatus(m, r) === "done")) return "done";
  if (mods.some((m) => moduleStatus(m, r) !== "todo")) return "in-progress";
  return "todo";
}

/** jauge de complétude globale (modules done / modules applicables) */
export function completeness(r: ReleveData): { done: number; total: number } {
  const mods = MODULES.filter(
    (m) => m.special !== "summary" && moduleStatus(m, r) !== "na"
  );
  return {
    done: mods.filter((m) => moduleStatus(m, r) === "done").length,
    total: mods.length,
  };
}

export { PHASES, MODULES };
