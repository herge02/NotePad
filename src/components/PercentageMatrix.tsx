"use client";

// Matrice de composition par étage, version compacte : chaque étage est un
// bloc fin avec ses matériaux (ligne = matériau + %), recherche pour ajouter.
// Somme par étage validée ≤ 100 %.

import { useState } from "react";
import { OTHER_OPTION } from "@/lib/formSchema";
import { btnDanger, inputSmCls } from "./ui";
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
    <div className="rounded border border-slate-200 p-2.5 dark:border-slate-700">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{floor.label}</span>
        <span className={`text-xs font-medium ${over ? "text-red-600" : "text-slate-500"}`}>
          {sum} %{over && " ⚠︎"}
        </span>
      </div>

      {selected.length > 0 && (
        <div className="mb-2 divide-y divide-slate-100 dark:divide-slate-800">
          {selected.map((opt) => (
            <div key={opt} className="flex min-h-[34px] items-center gap-1.5 py-0.5">
              <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{opt}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                className={`${inputSmCls} w-16 text-right`}
                value={values[opt] ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(floor.id, opt, raw === "" ? 0 : Math.max(0, Math.min(100, Number(raw))));
                }}
              />
              <span className="text-xs text-slate-400">%</span>
              <button
                type="button"
                className={btnDanger}
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
        className={`${inputSmCls} mb-1.5 w-full`}
        placeholder="Ajouter un matériau…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-1">
        {available.slice(0, search ? available.length : 8).map((opt) => (
          <button
            key={opt}
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-900/5 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-100/10"
            onClick={() => {
              onChange(floor.id, opt, 0);
              setSearch("");
            }}
          >
            + {opt}
          </button>
        ))}
        {available.length === 0 && <span className="text-xs text-slate-400">Aucune option correspondante.</span>}
        {!search && available.length > 8 && (
          <span className="self-center text-xs text-slate-400">… tapez pour chercher</span>
        )}
      </div>
    </div>
  );
}

export default function PercentageMatrix({ matrix, floors, values, onChange }: PercentageMatrixProps) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{matrix.title}</span>
        {matrix.help && <p className="text-xs text-slate-500">{matrix.help}</p>}
      </div>
      {floors.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
          Aucun étage défini — ajoutez-les à la section « Dimensions », les matrices se génèrent
          automatiquement.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
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
