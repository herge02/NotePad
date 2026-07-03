"use client";

// Résumé & export : champs obligatoires manquants, totaux de superficie,
// sections complétées, pièces par type, alertes de pourcentage > 100 %,
// exports JSON / CSV. (L'export PDF pourra s'appuyer sur la même structure.)

import { mezzanineArea, totalIncludedArea } from "./FloorsTable";
import { isFilled, isVisible, percentageSum, sectionStarted } from "@/lib/fieldLogic";
import { ROOM_SCHEMAS, SECTIONS, getRoomSchema } from "@/lib/formSchema";
import { exportCSV, exportJSON } from "@/lib/export";
import type { ReleveData } from "@/lib/types";

export interface SummarySectionProps {
  releve: ReleveData;
}

export default function SummarySection({ releve }: SummarySectionProps) {
  const { values, floors, rooms, matrices } = releve;

  // champs obligatoires manquants
  const missing: { section: string; label: string }[] = [];
  for (const section of SECTIONS) {
    for (const field of section.fields ?? []) {
      if (field.required && isVisible(field, values) && !isFilled(values[field.id])) {
        missing.push({ section: section.title, label: field.label });
      }
    }
  }

  // sections complétées (au moins un champ rempli / élément saisi)
  const started = SECTIONS.filter((s) => sectionStarted(s, releve));

  // pièces par type
  const roomCounts = ROOM_SCHEMAS.map((r) => ({
    label: r.label,
    count: rooms.filter((room) => room.type === r.id).length,
  })).filter((r) => r.count > 0);

  // alertes % > 100 : matrices par étage + groupes de pourcentages globaux
  const overAlerts: string[] = [];
  for (const section of SECTIONS) {
    for (const matrix of section.matrices ?? []) {
      for (const [floorId, opts] of Object.entries(matrices[matrix.id] ?? {})) {
        const sum = Object.values(opts).reduce((acc, v) => acc + (Number(v) || 0), 0);
        if (sum > 100) {
          const floorLabel = floors.find((f) => f.id === floorId)?.label ?? floorId;
          overAlerts.push(`${matrix.title} — ${floorLabel} : ${sum} %`);
        }
      }
    }
    for (const field of section.fields ?? []) {
      if (field.type === "percentage-group") {
        const sum = percentageSum(values[field.id] as Record<string, number> | undefined);
        if (sum > 100) overAlerts.push(`${field.label} : ${sum} %`);
      }
    }
  }
  const roofSum =
    (Number(values["toiture_pente_pct"]) || 0) + (Number(values["toiture_plate_pct"]) || 0);
  if (roofSum > 100) overAlerts.push(`Toiture (pente + plate) : ${roofSum} %`);

  const totalArea = totalIncludedArea(floors);
  const mezz = mezzanineArea(floors);
  const officeArea = Number(values["aire_bureau"]) || 0;
  const industrialTotal = Number(values["aire_totale_batiment_industriel"]) || 0;

  const card = "rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="space-y-4">
      {/* Alertes */}
      {missing.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <h3 className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
            Champs obligatoires manquants ({missing.length})
          </h3>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {missing.map((m, i) => (
              <li key={i}>
                {m.section} — {m.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {overAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <h3 className="mb-2 font-semibold text-red-800 dark:text-red-200">
            Pourcentages dépassant 100 % ({overAlerts.length})
          </h3>
          <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
            {overAlerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Totaux */}
      <div className={card}>
        <h3 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-100">Superficies</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-neutral-500">Aire totale (incluse)</dt>
            <dd className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
              {totalArea.toLocaleString("fr-CA")} pi²
            </dd>
          </div>
          {mezz > 0 && (
            <div>
              <dt className="text-neutral-500">Aire mezzanine</dt>
              <dd className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                {mezz.toLocaleString("fr-CA")} pi²
              </dd>
            </div>
          )}
          {industrialTotal > 0 && (
            <>
              <div>
                <dt className="text-neutral-500">% espace bureaux</dt>
                <dd className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {Math.round((officeArea / industrialTotal) * 1000) / 10} %
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">% espace usine</dt>
                <dd className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {Math.round((1 - officeArea / industrialTotal) * 1000) / 10} %
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {/* Sections */}
      <div className={card}>
        <h3 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-100">
          Sections commencées : {started.length} / {SECTIONS.length - 1}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.filter((s) => s.special !== "summary").map((s) => {
            const on = started.includes(s);
            return (
              <span
                key={s.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  on
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-400"
                }`}
              >
                {on ? "✓ " : ""}
                {s.short}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pièces */}
      <div className={card}>
        <h3 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-100">
          Pièces relevées : {rooms.length}
        </h3>
        {roomCounts.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune pièce relevée.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {roomCounts.map((r) => (
              <span
                key={r.label}
                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {r.label} × {r.count}
              </span>
            ))}
          </div>
        )}
        {rooms.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {rooms.map((room) => (
              <li key={room.id}>
                {room.label || getRoomSchema(room.type)?.label}
                {room.area !== undefined && ` — ${room.area} pi²`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Export */}
      <div className={card}>
        <h3 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">Export</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportJSON(releve)}
            className="min-h-[48px] rounded-xl bg-blue-600 px-5 font-semibold text-white"
          >
            Exporter JSON
          </button>
          <button
            type="button"
            onClick={() => exportCSV(releve)}
            className="min-h-[48px] rounded-xl border border-blue-600 px-5 font-semibold text-blue-600 dark:text-blue-400"
          >
            Exporter CSV
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Référence du relevé : {releve.reference || "—"} · Un export PDF imprimable pourra s'appuyer sur la
          même structure de données.
        </p>
      </div>
    </div>
  );
}
