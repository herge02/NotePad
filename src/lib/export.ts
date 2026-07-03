// Export JSON / CSV d'un relevé. L'export PDF imprimable pourra s'appuyer sur
// la même structure aplatie plus tard.

import { MODULES, getRoomSchema } from "./formSchema";
import type {
  DimsItem,
  FormField,
  MeasureValue,
  QuantityItem,
  ReleveData,
} from "./types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(releve: ReleveData): string {
  return (releve.reference || releve.id).replace(/[^\w.-]+/g, "_");
}

export function exportJSON(releve: ReleveData) {
  download(`releve_${safeName(releve)}.json`, JSON.stringify(releve, null, 2), "application/json");
}

// --- CSV -------------------------------------------------------------------

function csvEscape(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Row = [string, string, string, string]; // section, champ, sous-élément, valeur

function flattenFieldValue(field: FormField, value: unknown, rows: Row[], sectionTitle: string) {
  if (value === undefined || value === null || value === "" || value === false) return;
  switch (field.type) {
    case "quantity-list": {
      const items = value as Record<string, QuantityItem>;
      for (const [opt, item] of Object.entries(items)) {
        if (!item?.checked) continue;
        const parts = [item.quantity, item.note].filter(Boolean).join(" — ");
        rows.push([sectionTitle, field.label, opt, parts || "présent"]);
      }
      break;
    }
    case "dims-list": {
      const items = value as Record<string, DimsItem>;
      for (const [opt, item] of Object.entries(items)) {
        if (!item?.checked) continue;
        const parts = [
          item.length && `L: ${item.length}`,
          item.width && `l: ${item.width}`,
          item.area && `aire: ${item.area}`,
          item.note,
        ]
          .filter(Boolean)
          .join(", ");
        rows.push([sectionTitle, field.label, opt, parts || "présent"]);
      }
      break;
    }
    case "percentage-group": {
      const pct = value as Record<string, number>;
      for (const [opt, p] of Object.entries(pct)) {
        if (p === undefined || p === null) continue;
        rows.push([sectionTitle, field.label, opt, `${p} %`]);
      }
      break;
    }
    case "measure": {
      const m = value as MeasureValue;
      if (!m.value && !m.reference) return;
      rows.push([
        sectionTitle,
        field.label,
        "",
        [m.value && `${m.value} ${m.unit ?? ""}`.trim(), m.reference && `réf.: ${m.reference}`]
          .filter(Boolean)
          .join(" — "),
      ]);
      break;
    }
    case "checkbox-group": {
      const arr = value as string[];
      if (arr.length) rows.push([sectionTitle, field.label, "", arr.join("; ")]);
      break;
    }
    case "checkbox":
      rows.push([sectionTitle, field.label, "", "oui"]);
      break;
    default:
      rows.push([sectionTitle, field.label, "", String(value)]);
  }
}

export function toCSV(releve: ReleveData): string {
  const rows: Row[] = [];
  rows.push(["Relevé", "Référence", "", releve.reference || releve.id]);
  rows.push(["Relevé", "Dernière modification", "", releve.updatedAt]);

  const floorLabel = (floorId: string) =>
    releve.floors.find((f) => f.id === floorId)?.label ?? floorId;

  for (const section of MODULES) {
    for (const field of section.fields ?? []) {
      flattenFieldValue(field, releve.values[field.id], rows, section.title);
      const autre = releve.values[`${field.id}__autre`];
      if (autre) rows.push([section.title, `${field.label} — autre`, "", String(autre)]);
    }
    for (const matrix of section.matrices ?? []) {
      const perFloor = releve.matrices[matrix.id] ?? {};
      for (const [floorId, opts] of Object.entries(perFloor)) {
        for (const [opt, pct] of Object.entries(opts)) {
          rows.push([section.title, matrix.title, `${floorLabel(floorId)} — ${opt}`, `${pct} %`]);
        }
      }
    }
  }

  for (const f of releve.floors) {
    rows.push([
      "Dimensions — étages",
      f.label,
      "",
      [
        f.area !== undefined && `aire: ${f.area}`,
        f.perimeter !== undefined && `périmètre: ${f.perimeter}`,
        f.height !== undefined && `hauteur: ${f.height}`,
        f.included ? "incluse dans l'aire totale" : "exclue de l'aire totale",
      ]
        .filter(Boolean)
        .join(", "),
    ]);
  }

  for (const room of releve.rooms) {
    const schema = getRoomSchema(room.type);
    const base = `Pièce — ${room.label || schema?.label || room.type}`;
    rows.push([
      base,
      "Général",
      "",
      [
        schema?.label && `type: ${schema.label}`,
        room.floorId && `étage: ${floorLabel(room.floorId)}`,
        room.width !== undefined && `largeur: ${room.width}`,
        room.depth !== undefined && `profondeur: ${room.depth}`,
        room.area !== undefined && `aire: ${room.area}`,
      ]
        .filter(Boolean)
        .join(", "),
    ]);
    if (room.floorFinishes.length) rows.push([base, "Revêtement plancher", "", room.floorFinishes.join("; ")]);
    if (room.wallFinishes.length) rows.push([base, "Revêtement murs", "", room.wallFinishes.join("; ")]);
    if (room.ceilingFinishes.length) rows.push([base, "Revêtement plafond", "", room.ceilingFinishes.join("; ")]);
    if (room.notes) rows.push([base, "Notes", "", room.notes]);
    for (const field of schema?.fields ?? []) {
      flattenFieldValue(field, room.specific[field.id], rows, base);
      const autre = room.specific[`${field.id}__autre`];
      if (autre) rows.push([base, `${field.label} — autre`, "", String(autre)]);
    }
  }

  for (const r of releve.renovations) {
    rows.push([
      "Rénovations",
      r.type,
      r.year ?? "",
      [r.description, r.notes].filter(Boolean).join(" — "),
    ]);
  }

  const header = "Section,Champ,Sous-élément,Valeur";
  return [header, ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export function exportCSV(releve: ReleveData) {
  // BOM pour qu'Excel reconnaisse l'UTF-8 (accents français)
  download(`releve_${safeName(releve)}.csv`, "\uFEFF" + toCSV(releve), "text/csv;charset=utf-8");
}
