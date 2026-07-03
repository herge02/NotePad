"use client";

// Liste « sélections d'abord » : on affiche ce qui est coché, 8 chips
// fréquentes, une recherche, et la liste complète dans un panneau à la
// demande. Remplace l'inventaire exhaustif des quantity-list / dims-list /
// grands groupes de cases à cocher.

import { useMemo, useState } from "react";
import BottomSheet from "./BottomSheet";
import { OTHER_OPTION } from "@/lib/formSchema";
import { bumpOption, topOptions } from "@/lib/lastUsed";
import { checkCls, chipCls, inputSmCls } from "./ui";
import type { DimsItem, FieldValue, FormField, QuantityItem } from "@/lib/types";

export interface QuickSelectProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

type Mode = "quantity" | "dims" | "check";

function modeOf(field: FormField): Mode {
  if (field.type === "quantity-list") return "quantity";
  if (field.type === "dims-list") return "dims";
  return "check";
}

export default function QuickSelect({ field, value, onChange }: QuickSelectProps) {
  const mode = modeOf(field);
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // --- lecture / écriture selon le mode -----------------------------------
  const selected: string[] = useMemo(() => {
    if (mode === "check") return (value as string[]) ?? [];
    const items = (value as Record<string, QuantityItem | DimsItem>) ?? {};
    return options.filter((o) => items[o]?.checked === true);
  }, [mode, value, options]);

  const add = (opt: string) => {
    bumpOption(field.id, opt);
    if (mode === "check") {
      const arr = (value as string[]) ?? [];
      if (!arr.includes(opt)) onChange([...arr, opt]);
      return;
    }
    const items = { ...((value as Record<string, QuantityItem>) ?? {}) };
    items[opt] = { ...(items[opt] ?? {}), checked: true, quantity: items[opt]?.quantity ?? "1" };
    onChange(items as FieldValue);
    setSearch("");
  };

  const remove = (opt: string) => {
    if (mode === "check") {
      const arr = ((value as string[]) ?? []).filter((v) => v !== opt);
      onChange(arr.length ? arr : undefined);
      return;
    }
    const items = { ...((value as Record<string, QuantityItem>) ?? {}) };
    delete items[opt];
    onChange(Object.keys(items).length ? (items as FieldValue) : undefined);
  };

  const patchItem = (opt: string, patch: Record<string, string | boolean | undefined>) => {
    const items = { ...((value as Record<string, QuantityItem | DimsItem>) ?? {}) };
    items[opt] = { ...(items[opt] ?? { checked: true }), ...patch } as QuantityItem;
    onChange(items as FieldValue);
  };

  // --- suggestions ----------------------------------------------------------
  const chips = useMemo(
    () => topOptions(field.id, options, field.frequent, 8).filter((o) => !selected.includes(o)),
    [field.id, field.frequent, options, selected]
  );
  const searchResults = search
    ? options.filter((o) => !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()))
    : [];

  const qtyOf = (opt: string) => ((value as Record<string, QuantityItem>) ?? {})[opt];
  const dimsOf = (opt: string) => ((value as Record<string, DimsItem>) ?? {})[opt];

  const stepQty = (opt: string, delta: number) => {
    const current = Number(qtyOf(opt)?.quantity ?? "0");
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    patchItem(opt, { quantity: String(next) });
  };

  return (
    <div>
      {/* Sélections actuelles */}
      {selected.length > 0 && (
        <div className="mb-2 divide-y divide-slate-100 rounded border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {selected.map((opt) => (
            <div key={opt} className="px-2 py-1.5">
              <div className="flex min-h-[36px] items-center gap-1.5">
                <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{opt}</span>
                {mode === "quantity" && !field.noQuantity && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md border border-slate-300 text-base text-slate-600 dark:border-slate-600 dark:text-slate-300"
                      onClick={() => stepQty(opt, -1)}
                      aria-label={`Réduire ${opt}`}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputSmCls} w-14 text-center`}
                      placeholder={field.quantityLabel ?? "Qté"}
                      value={qtyOf(opt)?.quantity ?? ""}
                      onChange={(e) => patchItem(opt, { quantity: e.target.value || undefined })}
                      aria-label={`Quantité ${opt}`}
                    />
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md border border-slate-300 text-base text-slate-600 dark:border-slate-600 dark:text-slate-300"
                      onClick={() => stepQty(opt, 1)}
                      aria-label={`Augmenter ${opt}`}
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="h-9 w-9 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => remove(opt)}
                  aria-label={`Retirer ${opt}`}
                >
                  ✕
                </button>
              </div>
              {mode === "quantity" && (field.withNote || opt === OTHER_OPTION) && (
                <input
                  type="text"
                  className={`${inputSmCls} mt-1 w-full`}
                  placeholder={opt === OTHER_OPTION ? "Précisez…" : "Note / détail"}
                  value={qtyOf(opt)?.note ?? ""}
                  onChange={(e) => patchItem(opt, { note: e.target.value || undefined })}
                />
              )}
              {mode === "dims" && (
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputSmCls}
                    placeholder="Longueur"
                    value={dimsOf(opt)?.length ?? ""}
                    onChange={(e) => patchItem(opt, { length: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputSmCls}
                    placeholder="Largeur"
                    value={dimsOf(opt)?.width ?? ""}
                    onChange={(e) => patchItem(opt, { width: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputSmCls}
                    placeholder="Aire"
                    value={dimsOf(opt)?.area ?? ""}
                    onChange={(e) => patchItem(opt, { area: e.target.value || undefined })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chips rapides */}
      {chips.length > 0 && !search && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((opt) => (
            <button key={opt} type="button" className={chipCls(false)} onClick={() => add(opt)}>
              + {opt}
            </button>
          ))}
        </div>
      )}

      {/* Recherche + liste complète */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          className={`${inputSmCls} flex-1`}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="min-h-[36px] whitespace-nowrap rounded-md px-2 text-sm text-blue-600"
          onClick={() => setSheetOpen(true)}
        >
          Voir tout ({options.length})
        </button>
      </div>
      {search && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {searchResults.slice(0, 12).map((opt) => (
            <button key={opt} type="button" className={chipCls(false)} onClick={() => add(opt)}>
              + {opt}
            </button>
          ))}
          {searchResults.length === 0 && (
            <span className="text-xs text-slate-400">Aucune option correspondante.</span>
          )}
        </div>
      )}

      <BottomSheet open={sheetOpen} title={field.label} onClose={() => setSheetOpen(false)}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {options.map((opt) => {
            const on = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex min-h-[38px] cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  className={checkCls}
                  checked={on}
                  onChange={() => (on ? remove(opt) : add(opt))}
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
