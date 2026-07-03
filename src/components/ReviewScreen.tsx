"use client";

// Vérification avant export : seulement ce qui mérite attention — anomalies,
// requis manquants, modules jamais ouverts (acquittables « sans objet ») —
// puis les totaux et l'export. La relecture exhaustive n'est pas imposée.

import { MODULES, getModule } from "@/lib/formSchema";
import {
  allAnomalies,
  completeness,
  isUnansweredOptIn,
  isVisible,
  mezzanineArea,
  missingRequired,
  moduleStatus,
  totalIncludedArea,
} from "@/lib/fieldLogic";
import { exportCSV, exportJSON } from "@/lib/export";
import { exportExcelTemplate } from "@/lib/exportExcel";
import { btnPrimary, btnSubtle } from "./ui";
import { useState } from "react";
import type { ReleveData } from "@/lib/types";

export interface ReviewScreenProps {
  releve: ReleveData;
  onGoto: (moduleId: string) => void;
  onMarkNa: (moduleId: string) => void;
}

export default function ReviewScreen({ releve, onGoto, onMarkNa }: ReviewScreenProps) {
  const [excelState, setExcelState] = useState<"idle" | "busy" | "error">("idle");
  const anomalies = allAnomalies(releve);
  const missing = MODULES.flatMap((m) =>
    missingRequired(m, releve)
      .filter((f) => isVisible(f, releve.values))
      .map((f) => ({ module: m, field: f }))
  );
  const todos = MODULES.filter(
    (m) =>
      m.special !== "summary" &&
      moduleStatus(m, releve) === "todo" &&
      !isUnansweredOptIn(m, releve)
  );
  const questions = MODULES.filter((m) => isUnansweredOptIn(m, releve));
  const { done, total } = completeness(releve);
  const issues = anomalies.length + missing.length;

  const confirmExport = (fn: () => void) => {
    if (issues > 0 && !confirm(`Exporter malgré ${issues} point${issues > 1 ? "s" : ""} à corriger ?`)) {
      return;
    }
    fn();
  };

  const totalArea = totalIncludedArea(releve.floors);
  const mezz = mezzanineArea(releve.floors);

  const listCls =
    "rounded-md border px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      {/* Rien à signaler */}
      {issues === 0 && todos.length === 0 && questions.length === 0 && (
        <div className={`${listCls} border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200`}>
          ✓ Aucune anomalie, aucun requis manquant — le relevé est prêt à exporter.
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className={`${listCls} border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950`}>
          <div className="mb-1 font-semibold text-red-800 dark:text-red-200">
            Pourcentages dépassant 100 % ({anomalies.length})
          </div>
          <ul className="space-y-1">
            {anomalies.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <span className="flex-1">{a.message}</span>
                <button
                  type="button"
                  className="min-h-[36px] shrink-0 rounded-md px-2 text-sm font-medium text-blue-700 dark:text-blue-300"
                  onClick={() => onGoto(a.moduleId)}
                >
                  Corriger ›
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requis manquants */}
      {missing.length > 0 && (
        <div className={`${listCls} border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950`}>
          <div className="mb-1 font-semibold text-amber-800 dark:text-amber-200">
            Champs requis manquants ({missing.length})
          </div>
          <ul className="space-y-1">
            {missing.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <span className="flex-1">
                  {m.module.short} — {m.field.label}
                </span>
                <button
                  type="button"
                  className="min-h-[36px] shrink-0 rounded-md px-2 text-sm font-medium text-blue-700 dark:text-blue-300"
                  onClick={() => onGoto(m.module.id)}
                >
                  Compléter ›
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions sans réponse */}
      {questions.length > 0 && (
        <div className={`${listCls} border-slate-200 dark:border-slate-700`}>
          <div className="mb-1 font-semibold text-slate-700 dark:text-slate-300">
            Questions sans réponse ({questions.length})
          </div>
          <ul className="space-y-1">
            {questions.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="flex-1">{m.optIn!.question}</span>
                <button
                  type="button"
                  className="min-h-[36px] rounded-md px-2 text-sm text-blue-600"
                  onClick={() => onGoto("hub:" + m.phase)}
                >
                  Répondre ›
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modules jamais ouverts */}
      {todos.length > 0 && (
        <div className={`${listCls} border-slate-200 dark:border-slate-700`}>
          <div className="mb-1 font-semibold text-slate-700 dark:text-slate-300">
            Modules non remplis ({todos.length})
          </div>
          <ul className="space-y-1">
            {todos.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="flex-1">{getModule(m.id)?.title}</span>
                <button
                  type="button"
                  className="min-h-[36px] rounded-md px-2 text-sm text-blue-600"
                  onClick={() => onGoto(m.id)}
                >
                  Ouvrir ›
                </button>
                <button
                  type="button"
                  className="min-h-[36px] rounded-md px-2 text-sm text-slate-500"
                  onClick={() => onMarkNa(m.id)}
                >
                  Sans objet
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "Complétude", value: `${done}/${total} modules` },
          { label: "Aire totale", value: `${totalArea.toLocaleString("fr-CA")} pi²` },
          ...(mezz > 0 ? [{ label: "Mezzanine", value: `${mezz.toLocaleString("fr-CA")} pi²` }] : []),
          { label: "Pièces", value: String(releve.rooms.length) },
          { label: "Étages", value: String(releve.floors.length) },
        ].map((t) => (
          <div
            key={t.label}
            className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.value}</div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          disabled={excelState === "busy"}
          onClick={() =>
            confirmExport(async () => {
              setExcelState("busy");
              try {
                await exportExcelTemplate(releve);
                setExcelState("idle");
              } catch {
                setExcelState("error");
              }
            })
          }
          className={btnPrimary}
        >
          {excelState === "busy" ? "Génération…" : "Exporter Excel (.xlsm)"}
        </button>
        <button type="button" onClick={() => confirmExport(() => exportJSON(releve))} className={btnSubtle}>
          JSON
        </button>
        <button type="button" onClick={() => confirmExport(() => exportCSV(releve))} className={btnSubtle}>
          CSV
        </button>
        <span className="text-xs text-slate-400">
          {excelState === "error"
            ? "Erreur lors de la génération Excel."
            : `Réf. : ${releve.reference || "—"} · l'Excel est le formulaire original rempli (macro conservée).`}
        </span>
      </div>
    </div>
  );
}
