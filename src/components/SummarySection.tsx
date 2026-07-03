"use client";

// Résumé & export, version compacte : alertes, superficies, sections
// commencées, pièces par type, exports JSON / CSV.

import { mezzanineArea, totalIncludedArea } from "./FloorsTable";
import { isFilled, isVisible, percentageSum, sectionStarted } from "@/lib/fieldLogic";
import { ROOM_SCHEMAS, SECTIONS, getRoomSchema } from "@/lib/formSchema";
import { exportCSV, exportJSON } from "@/lib/export";
import { btnPrimary, btnSubtle } from "./ui";
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
        missing.push({ section: section.short, label: field.label });
      }
    }
  }

  const started = SECTIONS.filter((s) => sectionStarted(s, releve));

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
  const roofSum = (Number(values["toiture_pente_pct"]) || 0) + (Number(values["toiture_plate_pct"]) || 0);
  if (roofSum > 100) overAlerts.push(`Toiture (pente + plate) : ${roofSum} %`);

  const totalArea = totalIncludedArea(floors);
  const mezz = mezzanineArea(floors);
  const officeArea = Number(values["aire_bureau"]) || 0;
  const industrialTotal = Number(values["aire_totale_batiment_industriel"]) || 0;

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">Champs obligatoires manquants ({missing.length}) : </span>
          {missing.map((m) => `${m.section} — ${m.label}`).join(" · ")}
        </div>
      )}

      {overAlerts.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <span className="font-semibold">Pourcentages dépassant 100 % ({overAlerts.length}) :</span>
          <ul className="mt-1 list-inside list-disc">
            {overAlerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Superficies</div>
          <dl className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between gap-4">
              <dt>Aire totale (incluse)</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {totalArea.toLocaleString("fr-CA")} pi²
              </dd>
            </div>
            {mezz > 0 && (
              <div className="flex justify-between gap-4">
                <dt>Aire mezzanine</dt>
                <dd>{mezz.toLocaleString("fr-CA")} pi²</dd>
              </div>
            )}
            {industrialTotal > 0 && (
              <>
                <div className="flex justify-between gap-4">
                  <dt>% espace bureaux</dt>
                  <dd>{Math.round((officeArea / industrialTotal) * 1000) / 10} %</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>% espace usine</dt>
                  <dd>{Math.round((1 - officeArea / industrialTotal) * 1000) / 10} %</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sections commencées : {started.length} / {SECTIONS.length - 1}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {SECTIONS.filter((s) => s.special !== "summary").map((s) => {
              const on = started.includes(s);
              return (
                <span
                  key={s.id}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    on
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {s.short}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pièces relevées : {rooms.length}
        </div>
        {roomCounts.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Aucune pièce relevée.</p>
        ) : (
          <>
            <div className="mt-1 flex flex-wrap gap-1">
              {roomCounts.map((r) => (
                <span
                  key={r.label}
                  className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {r.label} × {r.count}
                </span>
              ))}
            </div>
            <ul className="mt-2 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
              {rooms.map((room) => (
                <li key={room.id}>
                  {room.label || getRoomSchema(room.type)?.label}
                  {room.area !== undefined && ` — ${room.area} pi²`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button type="button" onClick={() => exportJSON(releve)} className={btnPrimary}>
          Exporter JSON
        </button>
        <button type="button" onClick={() => exportCSV(releve)} className={btnSubtle}>
          Exporter CSV
        </button>
        <span className="text-xs text-slate-400">
          Réf. : {releve.reference || "—"} · structure prête pour un export PDF.
        </span>
      </div>
    </div>
  );
}
