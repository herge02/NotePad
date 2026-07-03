// Logique pure sur les champs : visibilité conditionnelle, remplissage,
// sommes de pourcentages, progression par section. Partagée entre le rendu,
// la navigation et le résumé.

import type { FieldValue, FormField, FormSection, QuantityItem, ReleveData } from "./types";

export function isVisible(field: FormField, values: Record<string, FieldValue>): boolean {
  const cond = field.showIf;
  if (!cond) return true;
  const v = values[cond.field];
  if (cond.equals !== undefined) return v === cond.equals;
  if (cond.includes !== undefined) {
    if (Array.isArray(v)) return v.includes(cond.includes);
    return typeof v === "string" && v === cond.includes;
  }
  if (cond.truthy) {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "" && v !== false && v !== 0;
  }
  return true;
}

/** un champ est-il « rempli » (pour la progression) ? */
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

/** la section contient-elle au moins une donnée saisie ? */
export function sectionStarted(section: FormSection, releve: ReleveData): boolean {
  if (section.special === "rooms") return releve.rooms.length > 0;
  if (section.special === "renovations") return releve.renovations.length > 0;
  if (section.special === "summary") return false;
  const fieldStarted = (section.fields ?? []).some((f) => isFilled(releve.values[f.id]));
  if (fieldStarted) return true;
  if (section.special === "floors" && releve.floors.length > 0) return true;
  return (section.matrices ?? []).some((m) =>
    Object.values(releve.matrices[m.id] ?? {}).some((perFloor) => Object.keys(perFloor).length > 0)
  );
}
