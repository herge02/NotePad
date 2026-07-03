"use client";

// Matrice de composition par étage : pour chaque étage défini dans l'onglet
// « Dimensions », on ajoute des options (avec recherche) et un pourcentage.
// Validation : la somme par étage ne doit pas dépasser 100 %.

import { useState } from "react";
import { OTHER_OPTION } from "@/lib/formSchema";
import type { FloorData, MatrixDef } from "@/lib/types";

export interface PercentageMatrixProps {
  matrix: MatrixDef;
  floors: FloorData[];
  /** floorId -> option -> % */
  values: Record<string, Record<string, number>>;
  onChange: (floorId: string, option: string, pct: number | undefined) => void;
}

function FloorMatrix({
  matrix,
  floor,
  values,
  onChange,
}: {
  matrix: MatrixDef;
  floor: FloorData;
  values: Record<string, number>;
  onChange: PercentageMatrixProps["onChange"];
}) {
  const [search, setSearch] = useState("");
  const options = matrix.other ? [...matrix.options, OTHER_OPTION] : matrix.options;
  const selected = Object.keys(values);
  const available = options.filter(
    (o) => !selected.includes(o) && (!search || o.toLowerCase().includes(search.toLowerCase()))
  );
  const sum = Object.values(values).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const over = matrix.validateSum !== false && sum > 100;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{floor.label}</h4>
        <span className={`text-sm font-medium ${over ? "text-red-600" : "text-neutral-500"}`}>
          {sum} %{over && " ⚠︎"}
        </span>
      </div>

      {selected.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {selected.map((opt) => (
            <div
              key={opt}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-950"
            >
              <span className="flex-1 text-base text-neutral-800 dark:text-neutral-100">{opt}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                className="w-20 min-h-[40px] rounded-lg border border-neutral-300 bg-white px-2 text-right text-base dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                value={values[opt] ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(
                    floor.id,
                    opt,
                    raw === "" ? 0 : Math.max(0, Math.min(100, Number(raw)))
                  );
                }}
              />
              <span className="text-sm text-neutral-500">%</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-red-500"
                onClick={() => onChange(floor.id, opt, undefined)}
                aria-label={`Retirer ${opt}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="search"
        className="mb-2 w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        placeholder="Rechercher un matériau à ajouter…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        {available.map((opt) => (
          <button
            key={opt}
            type="button"
            className="min-h-[40px] rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
            onClick={() => {
              onChange(floor.id, opt, 0);
              setSearch("");
            }}
          >
            + {opt}
          </button>
        ))}
        {available.length === 0 && (
          <span className="text-sm text-neutral-400">Aucune option correspondante.</span>
        )}
      </div>
    </div>
  );
}

export default function PercentageMatrix({ matrix, floors, values, onChange }: PercentageMatrixProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{matrix.title}</h3>
        {matrix.help && <p className="text-xs text-neutral-500">{matrix.help}</p>}
      </div>
      {floors.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-600">
          Aucun étage défini. Ajoutez d'abord les étages dans l'onglet « Dimensions » — les matrices se
          génèrent automatiquement à partir de ceux-ci.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {floors.map((floor) => (
            <FloorMatrix
              key={floor.id}
              matrix={matrix}
              floor={floor}
              values={values[floor.id] ?? {}}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
