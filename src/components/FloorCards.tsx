"use client";

// Étages en cartes courtes (remplace le tableau dense) : préréglages quand la
// liste est vide, ligne compacte libellé + aire + inclusion, détail au tap.
// Source de vérité des matrices et du relevé par pièce.

import { useState } from "react";
import { FLOOR_PRESETS } from "@/lib/formSchema";
import { mezzanineArea, totalIncludedArea } from "@/lib/fieldLogic";
import { uid } from "@/lib/uid";
import { FLOOR_TYPES, type FloorData, type FloorType } from "@/lib/types";
import { btnDanger, btnGhost, btnPrimary, checkCls, chipCls, inputSmCls, labelCls } from "./ui";

export interface FloorCardsProps {
  floors: FloorData[];
  onChange: (floors: FloorData[]) => void;
}

export default function FloorCards({ floors, onChange }: FloorCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<FloorData>) =>
    onChange(floors.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const add = () => {
    const type: FloorType = floors.length === 0 ? "Rez-de-chaussée" : "Étage";
    const count = floors.filter((f) => f.type === type).length;
    const id = uid();
    onChange([
      ...floors,
      { id, type, label: count > 0 ? `${type} ${count + 1}` : type, included: true },
    ]);
    setOpenId(id);
  };

  const applyPreset = (preset: (typeof FLOOR_PRESETS)[number]) => {
    onChange(
      preset.floors.map((p) => ({
        id: uid(),
        type: p.type as FloorType,
        label: p.label,
        included: true,
      }))
    );
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

  const numVal = (v: number | undefined) => (v === undefined ? "" : String(v));

  return (
    <div className="space-y-2">
      {floors.length === 0 ? (
        <div>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            Configuration rapide — choisissez un préréglage ou ajoutez les niveaux un à un :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FLOOR_PRESETS.map((p) => (
              <button key={p.label} type="button" className={chipCls(false)} onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
            <button type="button" className={chipCls(false)} onClick={add}>
              + Personnalisé
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {floors.map((floor, idx) => {
              const open = openId === floor.id;
              return (
                <div
                  key={floor.id}
                  className="rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex min-h-[44px] items-center gap-2 px-2 py-1">
                    <button
                      type="button"
                      className="flex min-h-[36px] flex-1 items-center gap-2 text-left"
                      onClick={() => setOpenId(open ? null : floor.id)}
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {floor.label}
                      </span>
                      <span className={`text-xs ${open ? "text-slate-500" : "text-slate-400"}`}>
                        {open ? "▴ détails" : "▾"}
                      </span>
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      className={`${inputSmCls} w-24 text-right`}
                      placeholder="Aire pi²"
                      value={numVal(floor.area)}
                      onChange={(e) =>
                        update(floor.id, { area: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                      aria-label={`Aire de ${floor.label}`}
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        className={checkCls}
                        checked={floor.included}
                        onChange={(e) => update(floor.id, { included: e.target.checked })}
                        aria-label="Inclure dans l'aire totale"
                      />
                      incl.
                    </label>
                  </div>

                  {open && (
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2 md:grid-cols-4 dark:border-slate-800">
                      <label className="flex flex-col gap-1">
                        <span className={labelCls}>Type</span>
                        <select
                          className={inputSmCls}
                          value={floor.type}
                          onChange={(e) => update(floor.id, { type: e.target.value as FloorType })}
                        >
                          {FLOOR_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={labelCls}>Libellé</span>
                        <input
                          type="text"
                          className={inputSmCls}
                          value={floor.label}
                          onChange={(e) => update(floor.id, { label: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={labelCls}>Périmètre (pi)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className={inputSmCls}
                          value={numVal(floor.perimeter)}
                          onChange={(e) =>
                            update(floor.id, {
                              perimeter: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={labelCls}>Hauteur ext. (pi)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className={inputSmCls}
                          value={numVal(floor.height)}
                          onChange={(e) =>
                            update(floor.id, {
                              height: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <div className="col-span-2 flex justify-end gap-1 md:col-span-4">
                        <button type="button" className={btnGhost} onClick={() => move(floor.id, -1)} disabled={idx === 0}>
                          ↑
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => move(floor.id, 1)}
                          disabled={idx === floors.length - 1}
                        >
                          ↓
                        </button>
                        <button type="button" className={btnGhost} onClick={() => duplicate(floor)}>
                          ⧉ Dupliquer
                        </button>
                        <button type="button" className={btnDanger} onClick={() => remove(floor.id)}>
                          ✕ Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Aire totale (incluse) : {totalIncludedArea(floors).toLocaleString("fr-CA")} pi²
              {mezzanineArea(floors) > 0 && (
                <span className="ml-3 font-normal text-slate-500">
                  Mezzanine : {mezzanineArea(floors).toLocaleString("fr-CA")} pi²
                </span>
              )}
            </span>
            <button type="button" onClick={add} className={btnPrimary}>
              + Étage
            </button>
          </div>
        </>
      )}
    </div>
  );
}
