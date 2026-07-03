"use client";

// Tableau dynamique d'étages — source de vérité pour toutes les matrices par
// étage. Tableau compact : une ligne par niveau.

import { uid } from "@/lib/uid";
import { FLOOR_TYPES, type FloorData, type FloorType } from "@/lib/types";
import { btnDanger, btnGhost, btnPrimary, checkCls, inputSmCls } from "./ui";

export interface FloorsTableProps {
  floors: FloorData[];
  onChange: (floors: FloorData[]) => void;
}

function defaultLabel(type: FloorType, floors: FloorData[]): string {
  const count = floors.filter((f) => f.type === type).length;
  return count > 0 ? `${type} ${count + 1}` : type;
}

export function totalIncludedArea(floors: FloorData[]): number {
  return floors.filter((f) => f.included).reduce((acc, f) => acc + (Number(f.area) || 0), 0);
}

export function mezzanineArea(floors: FloorData[]): number {
  return floors.filter((f) => f.type === "Mezzanine").reduce((acc, f) => acc + (Number(f.area) || 0), 0);
}

export default function FloorsTable({ floors, onChange }: FloorsTableProps) {
  const update = (id: string, patch: Partial<FloorData>) =>
    onChange(floors.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const add = () => {
    const type: FloorType = floors.length === 0 ? "Rez-de-chaussée" : "Étage";
    onChange([...floors, { id: uid(), type, label: defaultLabel(type, floors), included: true }]);
  };

  const duplicate = (floor: FloorData) => {
    const idx = floors.indexOf(floor);
    const next = [...floors];
    next.splice(idx + 1, 0, { ...floor, id: uid(), label: `${floor.label} (copie)` });
    onChange(next);
  };

  const remove = (id: string) => onChange(floors.filter((f) => f.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = floors.findIndex((f) => f.id === id);
    const to = idx + dir;
    if (to < 0 || to >= floors.length) return;
    const next = [...floors];
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const num = (v: number | undefined) => (v === undefined ? "" : String(v));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Étages ({floors.length}) — alimentent les matrices par étage et le relevé par pièce
        </span>
        <button type="button" onClick={add} className={btnPrimary}>
          + Étage
        </button>
      </div>

      {floors.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
          Aucun étage. Ajoutez les niveaux du bâtiment (sous-sol, rez-de-chaussée, étages…).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
                <th className="pb-1 pr-2 font-medium">Type</th>
                <th className="pb-1 pr-2 font-medium">Libellé</th>
                <th className="pb-1 pr-2 font-medium">Aire (pi²)</th>
                <th className="pb-1 pr-2 font-medium">Périm. (pi)</th>
                <th className="pb-1 pr-2 font-medium">Haut. (pi)</th>
                <th className="pb-1 pr-2 text-center font-medium" title="Inclure dans l'aire totale">
                  Incl.
                </th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {floors.map((floor, idx) => (
                <tr key={floor.id}>
                  <td className="py-1 pr-2">
                    <select
                      className={`${inputSmCls} w-full min-w-[130px]`}
                      value={floor.type}
                      onChange={(e) => update(floor.id, { type: e.target.value as FloorType })}
                    >
                      {FLOOR_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="text"
                      className={`${inputSmCls} w-full min-w-[110px]`}
                      value={floor.label}
                      onChange={(e) => update(floor.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={`${inputSmCls} w-24`}
                      value={num(floor.area)}
                      onChange={(e) =>
                        update(floor.id, { area: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={`${inputSmCls} w-20`}
                      value={num(floor.perimeter)}
                      onChange={(e) =>
                        update(floor.id, { perimeter: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={`${inputSmCls} w-20`}
                      value={num(floor.height)}
                      onChange={(e) =>
                        update(floor.id, { height: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2 text-center">
                    <input
                      type="checkbox"
                      className={checkCls}
                      checked={floor.included}
                      onChange={(e) => update(floor.id, { included: e.target.checked })}
                      aria-label="Inclure dans l'aire totale"
                    />
                  </td>
                  <td className="whitespace-nowrap py-1 text-right">
                    <button type="button" className={btnGhost} onClick={() => move(floor.id, -1)} disabled={idx === 0} aria-label="Monter">
                      ↑
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => move(floor.id, 1)}
                      disabled={idx === floors.length - 1}
                      aria-label="Descendre"
                    >
                      ↓
                    </button>
                    <button type="button" className={btnGhost} onClick={() => duplicate(floor)} aria-label="Dupliquer" title="Dupliquer">
                      ⧉
                    </button>
                    <button type="button" className={btnDanger} onClick={() => remove(floor.id)} aria-label="Supprimer" title="Supprimer">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {floors.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Aire totale (incluse) : {totalIncludedArea(floors).toLocaleString("fr-CA")} pi²
          </span>
          {mezzanineArea(floors) > 0 && (
            <span className="text-slate-600 dark:text-slate-300">
              Aire mezzanine : {mezzanineArea(floors).toLocaleString("fr-CA")} pi²
            </span>
          )}
        </div>
      )}
    </div>
  );
}
