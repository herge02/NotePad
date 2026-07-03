"use client";

// Liste répétable de rénovations — lignes compactes : type + description +
// année + notes, duplication et suppression.

import { RENOVATION_TYPES } from "@/lib/formSchema";
import { uid } from "@/lib/uid";
import { btnDanger, btnGhost, btnPrimary, inputSmCls } from "./ui";
import type { RenovationData } from "@/lib/types";

export interface RenovationListProps {
  renovations: RenovationData[];
  onChange: (renovations: RenovationData[]) => void;
}

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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          On note qu'une rénovation a eu lieu et son année — sans évaluer le résultat.
        </span>
        <button type="button" onClick={add} className={btnPrimary}>
          + Rénovation
        </button>
      </div>

      {renovations.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
          Aucune rénovation enregistrée.
        </p>
      ) : (
        <div className="space-y-1">
          <div className="hidden grid-cols-[170px_1fr_80px_1fr_90px] gap-2 text-xs font-medium text-slate-500 md:grid">
            <span>Type</span>
            <span>Description</span>
            <span>Année</span>
            <span>Notes</span>
            <span />
          </div>
          {renovations.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-2 items-center gap-2 border-b border-slate-100 py-1 last:border-0 md:grid-cols-[170px_1fr_80px_1fr_90px] dark:border-slate-800"
            >
              <select
                className={`${inputSmCls} col-span-2 md:col-span-1`}
                value={item.type}
                onChange={(e) => update(item.id, { type: e.target.value })}
              >
                {RENOVATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className={inputSmCls}
                placeholder="Description"
                value={item.description ?? ""}
                onChange={(e) => update(item.id, { description: e.target.value || undefined })}
              />
              <input
                type="number"
                inputMode="numeric"
                className={inputSmCls}
                placeholder="Année"
                value={item.year ?? ""}
                onChange={(e) => update(item.id, { year: e.target.value || undefined })}
              />
              <input
                type="text"
                className={inputSmCls}
                placeholder="Notes"
                value={item.notes ?? ""}
                onChange={(e) => update(item.id, { notes: e.target.value || undefined })}
              />
              <div className="col-span-2 whitespace-nowrap text-right md:col-span-1">
                <button type="button" className={btnGhost} onClick={() => duplicate(item)} title="Dupliquer">
                  ⧉
                </button>
                <button type="button" className={btnDanger} onClick={() => remove(item.id)} title="Supprimer">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
