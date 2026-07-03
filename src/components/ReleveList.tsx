"use client";

// Écran « Mes relevés » : reprendre ou créer un dossier. Une décision par
// écran — la liste montre référence, date, jauge de complétude et anomalies.

import { allAnomalies, completeness } from "@/lib/fieldLogic";
import { exportJSON } from "@/lib/export";
import { btnDanger, btnGhost } from "./ui";
import type { ReleveData } from "@/lib/types";

export default function ReleveList({
  releves,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
}: {
  releves: ReleveData[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <button
        type="button"
        onClick={onNew}
        className="flex min-h-[56px] w-full items-center justify-center rounded-lg bg-blue-600 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        + Nouveau relevé
      </button>

      {releves.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-600">
          Aucun relevé sur cet appareil. Les relevés sont stockés localement et
          fonctionnent hors ligne.
        </p>
      ) : (
        <div className="space-y-1.5">
          {releves.map((r) => {
            const { done, total } = completeness(r);
            const anomalies = allAnomalies(r).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div
                key={r.id}
                className="rounded-md border border-slate-900/10 bg-white dark:border-slate-100/10 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {r.reference || "sans référence"}
                    </span>
                    <span className="block text-xs text-slate-400">
                      Modifié {new Date(r.updatedAt).toLocaleString("fr-CA")}
                    </span>
                    <span className="mt-1 block h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className={`block h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                  {anomalies > 0 && (
                    <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-200">
                      ⚠ {anomalies}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-slate-400">
                    {done}/{total}
                  </span>
                  <span className="text-slate-300">›</span>
                </button>
                <div className="flex justify-end gap-1 border-t border-slate-100 px-2 py-1 dark:border-slate-800">
                  <button type="button" className={btnGhost} onClick={() => onDuplicate(r.id)}>
                    ⧉ Dupliquer
                  </button>
                  <button type="button" className={btnGhost} onClick={() => exportJSON(r)}>
                    Exporter
                  </button>
                  <button type="button" className={btnDanger} onClick={() => onDelete(r.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
