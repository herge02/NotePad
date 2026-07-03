"use client";

// Liste répétable de rénovations : type + description + année + notes,
// avec duplication et suppression.

import { RENOVATION_TYPES } from "@/lib/formSchema";
import { uid } from "@/lib/uid";
import type { RenovationData } from "@/lib/types";

export interface RenovationListProps {
  renovations: RenovationData[];
  onChange: (renovations: RenovationData[]) => void;
}

const cellInput =
  "w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2 text-base " +
  "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

export default function RepeatableList({ renovations, onChange }: RenovationListProps) {
  const update = (id: string, patch: Partial<RenovationData>) =>
    onChange(renovations.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const add = () => onChange([...renovations, { id: uid(), type: RENOVATION_TYPES[0] }]);

  const duplicate = (item: RenovationData) => {
    const idx = renovations.indexOf(item);
    const next = [...renovations];
    next.splice(idx + 1, 0, { ...item, id: uid() });
    onChange(next);
  };

  const remove = (id: string) => onChange(renovations.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Rénovations ({renovations.length})
          </h3>
          <p className="text-xs text-neutral-500">
            On note qu'une rénovation a eu lieu et son année — sans évaluer le résultat.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="min-h-[44px] rounded-xl bg-blue-600 px-4 font-semibold text-white"
        >
          + Ajouter
        </button>
      </div>

      {renovations.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-600">
          Aucune rénovation enregistrée.
        </p>
      )}

      <div className="space-y-2">
        {renovations.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="col-span-2 md:col-span-1">
                <span className="text-xs font-medium text-neutral-500">Type</span>
                <select
                  className={cellInput}
                  value={item.type}
                  onChange={(e) => update(item.id, { type: e.target.value })}
                >
                  {RENOVATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2">
                <span className="text-xs font-medium text-neutral-500">Description</span>
                <input
                  type="text"
                  className={cellInput}
                  value={item.description ?? ""}
                  onChange={(e) => update(item.id, { description: e.target.value || undefined })}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-neutral-500">Année</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={cellInput}
                  placeholder="ex. 2018"
                  value={item.year ?? ""}
                  onChange={(e) => update(item.id, { year: e.target.value || undefined })}
                />
              </label>
              <label className="col-span-2 md:col-span-3">
                <span className="text-xs font-medium text-neutral-500">Notes</span>
                <input
                  type="text"
                  className={cellInput}
                  value={item.notes ?? ""}
                  onChange={(e) => update(item.id, { notes: e.target.value || undefined })}
                />
              </label>
              <div className="col-span-2 flex items-end justify-end gap-2 md:col-span-1">
                <button
                  type="button"
                  onClick={() => duplicate(item)}
                  className="min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm dark:border-neutral-600 dark:text-neutral-200"
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="min-h-[44px] rounded-xl border border-red-300 px-3 text-sm text-red-600 dark:border-red-800"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
