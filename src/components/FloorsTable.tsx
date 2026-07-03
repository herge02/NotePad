"use client";

// Tableau dynamique d'étages — source de vérité pour toutes les matrices par
// étage. Ajout, duplication, suppression, réordonnancement, inclusion dans
// l'aire totale.

import { uid } from "@/lib/uid";
import { FLOOR_TYPES, type FloorData, type FloorType } from "@/lib/types";

export interface FloorsTableProps {
  floors: FloorData[];
  onChange: (floors: FloorData[]) => void;
}

function defaultLabel(type: FloorType, floors: FloorData[]): string {
  const count = floors.filter((f) => f.type === type).length;
  return count > 0 ? `${type} ${count + 1}` : type;
}

const cellInput =
  "w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2 text-base " +
  "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

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
    const copy: FloorData = { ...floor, id: uid(), label: `${floor.label} (copie)` };
    const next = [...floors];
    next.splice(idx + 1, 0, copy);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          Étages ({floors.length})
        </h3>
        <button
          type="button"
          onClick={add}
          className="min-h-[44px] rounded-xl bg-blue-600 px-4 font-semibold text-white"
        >
          + Ajouter un étage
        </button>
      </div>

      {floors.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-600">
          Ajoutez les étages du bâtiment — ils alimentent toutes les matrices par étage
          (planchers, revêtements, finition intérieure) et le module par pièce.
        </p>
      )}

      <div className="space-y-2">
        {floors.map((floor, idx) => (
          <div
            key={floor.id}
            className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="col-span-2 md:col-span-1">
                <span className="text-xs font-medium text-neutral-500">Type d'étage</span>
                <select
                  className={cellInput}
                  value={floor.type}
                  onChange={(e) => {
                    const type = e.target.value as FloorType;
                    update(floor.id, { type, label: floor.label || type });
                  }}
                >
                  {FLOOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 md:col-span-1">
                <span className="text-xs font-medium text-neutral-500">Libellé</span>
                <input
                  type="text"
                  className={cellInput}
                  value={floor.label}
                  onChange={(e) => update(floor.id, { label: e.target.value })}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-neutral-500">Aire (pi²)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className={cellInput}
                  value={floor.area ?? ""}
                  onChange={(e) =>
                    update(floor.id, { area: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </label>
              <label>
                <span className="text-xs font-medium text-neutral-500">Périmètre au sol (pi)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className={cellInput}
                  value={floor.perimeter ?? ""}
                  onChange={(e) =>
                    update(floor.id, { perimeter: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </label>
              <label>
                <span className="text-xs font-medium text-neutral-500">Hauteur ext. (pi)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className={cellInput}
                  value={floor.height ?? ""}
                  onChange={(e) =>
                    update(floor.id, { height: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </label>
              <div className="col-span-2 flex items-end gap-2 md:col-span-3">
                <button
                  type="button"
                  onClick={() => update(floor.id, { included: !floor.included })}
                  className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-medium ${
                    floor.included
                      ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "border-neutral-300 bg-white text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800"
                  }`}
                >
                  {floor.included ? "✓ Incluse dans l'aire totale" : "Exclue de l'aire totale"}
                </button>
                <button
                  type="button"
                  onClick={() => move(floor.id, -1)}
                  disabled={idx === 0}
                  className="min-h-[44px] w-11 rounded-xl border border-neutral-300 text-lg disabled:opacity-30 dark:border-neutral-600 dark:text-neutral-200"
                  aria-label="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(floor.id, 1)}
                  disabled={idx === floors.length - 1}
                  className="min-h-[44px] w-11 rounded-xl border border-neutral-300 text-lg disabled:opacity-30 dark:border-neutral-600 dark:text-neutral-200"
                  aria-label="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => duplicate(floor)}
                  className="min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm dark:border-neutral-600 dark:text-neutral-200"
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => remove(floor.id)}
                  className="min-h-[44px] rounded-xl border border-red-300 px-3 text-sm text-red-600 dark:border-red-800"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {floors.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-2xl bg-neutral-100 p-4 text-sm dark:bg-neutral-800">
          <span className="font-semibold text-neutral-800 dark:text-neutral-100">
            Aire totale (incluse) : {totalIncludedArea(floors).toLocaleString("fr-CA")} pi²
          </span>
          {mezzanineArea(floors) > 0 && (
            <span className="text-neutral-600 dark:text-neutral-300">
              Aire mezzanine : {mezzanineArea(floors).toLocaleString("fr-CA")} pi²
            </span>
          )}
        </div>
      )}
    </div>
  );
}
