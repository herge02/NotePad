"use client";

// Matrice de composition par étage, un étage à la fois : chips d'étages avec
// jauge, sélections + %, raccourcis « Copier de l'étage précédent »,
// « 100 % » et « Compléter à 100 % ». Somme validée ≤ 100 %, jamais bloquant.

import { useState } from "react";
import { OTHER_OPTION } from "@/lib/formSchema";
import { bumpOption, topOptions } from "@/lib/lastUsed";
import { chipCls, inputSmCls } from "./ui";
import type { FloorData, MatrixDef } from "@/lib/types";

export interface MatrixBlockProps {
  matrix: MatrixDef;
  floors: FloorData[];
  /** floorId -> option -> % */
  values: Record<string, Record<string, number>>;
  onChange: (floorId: string, option: string, pct: number | undefined) => void;
  /** remplace toutes les valeurs d'un étage (copie d'étage) */
  onSetFloor: (floorId: string, values: Record<string, number>) => void;
}

const sumOf = (v: Record<string, number> | undefined) =>
  Object.values(v ?? {}).reduce((acc, x) => acc + (Number(x) || 0), 0);

export default function MatrixBlock({ matrix, floors, values, onChange, onSetFloor }: MatrixBlockProps) {
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (floors.length === 0) {
    return (
      <div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{matrix.title}</span>
        <p className="mt-1 rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
          Ajoutez d'abord les étages (module « Étages ») — les matrices se génèrent automatiquement.
        </p>
      </div>
    );
  }

  const active = floors.find((f) => f.id === activeFloorId) ?? floors[0];
  const current = values[active.id] ?? {};
  const selected = Object.keys(current);
  const sum = sumOf(current);
  const over = matrix.validateSum !== false && sum > 100;

  const options = matrix.other ? [...matrix.options, OTHER_OPTION] : matrix.options;
  const suggestions = topOptions(`matrix:${matrix.id}`, options, undefined, 6).filter(
    (o) => !selected.includes(o) && (!search || o.toLowerCase().includes(search.toLowerCase()))
  );
  const searchResults = search
    ? options.filter((o) => !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()))
    : suggestions;

  const prevFloor = floors[floors.indexOf(active) - 1];
  const canCopyPrev =
    prevFloor && selected.length === 0 && Object.keys(values[prevFloor.id] ?? {}).length > 0;

  const add = (opt: string) => {
    bumpOption(`matrix:${matrix.id}`, opt);
    onChange(active.id, opt, selected.length === 0 ? 100 : 0);
    setSearch("");
  };

  const completeTo100 = () => {
    const rest = 100 - sum;
    if (rest <= 0 || selected.length === 0) return;
    const last = selected[selected.length - 1];
    onChange(active.id, last, Math.min(100, (current[last] ?? 0) + rest));
  };

  return (
    <div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{matrix.title}</span>

      {/* Chips d'étages avec jauge */}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {floors.map((f) => {
          const s = sumOf(values[f.id]);
          const isActive = f.id === active.id;
          return (
            <button
              key={f.id}
              type="button"
              className={chipCls(isActive)}
              onClick={() => setActiveFloorId(f.id)}
            >
              {f.label}
              {s > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    s > 100 ? "text-red-300 font-bold" : isActive ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {s} %
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Étage actif */}
      <div className="mt-2 rounded border border-slate-200 p-2.5 dark:border-slate-700">
        {selected.length > 0 && (
          <div className="mb-2 divide-y divide-slate-100 dark:divide-slate-800">
            {selected.map((opt) => (
              <div key={opt} className="flex min-h-[36px] items-center gap-1.5 py-0.5">
                <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  className={`${inputSmCls} w-16 text-right`}
                  value={current[opt] ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onChange(active.id, opt, raw === "" ? 0 : Math.max(0, Math.min(100, Number(raw))));
                  }}
                />
                <span className="text-xs text-slate-400">%</span>
                <button
                  type="button"
                  className="h-8 w-8 rounded-md text-sm text-red-600"
                  onClick={() => onChange(active.id, opt, undefined)}
                  aria-label={`Retirer ${opt}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Raccourcis */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {canCopyPrev && (
            <button
              type="button"
              className={chipCls(false)}
              onClick={() => onSetFloor(active.id, { ...(values[prevFloor.id] ?? {}) })}
            >
              ⧉ Copier de « {prevFloor.label} »
            </button>
          )}
          {selected.length === 1 && (current[selected[0]] ?? 0) < 100 && (
            <button type="button" className={chipCls(false)} onClick={() => onChange(active.id, selected[0], 100)}>
              100 %
            </button>
          )}
          {selected.length > 1 && sum < 100 && (
            <button type="button" className={chipCls(false)} onClick={completeTo100}>
              Compléter à 100 %
            </button>
          )}
          <span className={`ml-auto text-xs font-medium ${over ? "text-red-600" : "text-slate-500"}`}>
            {sum} %{over && ` — retirez ${sum - 100} %`}
          </span>
        </div>

        {/* Ajout : recherche + suggestions */}
        <input
          type="search"
          className={`${inputSmCls} w-full`}
          placeholder="Ajouter un matériau…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {searchResults.slice(0, search ? 12 : 6).map((opt) => (
            <button key={opt} type="button" className={chipCls(false)} onClick={() => add(opt)}>
              + {opt}
            </button>
          ))}
          {search && searchResults.length === 0 && (
            <span className="text-xs text-slate-400">Aucune option correspondante.</span>
          )}
        </div>
      </div>
    </div>
  );
}
