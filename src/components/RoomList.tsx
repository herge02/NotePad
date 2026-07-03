"use client";

// Module « Relevé par pièce » : une pièce = une carte courte. Type en chips
// (fréquents d'abord), champs spécifiques essentiels + « Plus de détails »,
// revêtements en lignes-résumé (sélecteur à la demande — listes DRY de la
// finition intérieure), « Enregistrer et +1 pièce » pour enchaîner.

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import DetailsAccordion from "./DetailsAccordion";
import FormRenderer from "./FormRenderer";
import {
  CEILING_FINISH_OPTIONS,
  FLOOR_FINISH_OPTIONS,
  ROOM_SCHEMAS,
  WALL_FINISH_OPTIONS,
  getRoomSchema,
} from "@/lib/formSchema";
import { isFilled } from "@/lib/fieldLogic";
import { getLast, setLast } from "@/lib/lastUsed";
import { uid } from "@/lib/uid";
import { btnDanger, btnGhost, btnPrimary, btnSubtle, checkCls, chipCls, inputSmCls, labelCls } from "./ui";
import type { FieldValue, FloorData, RoomData } from "@/lib/types";

export interface RoomListProps {
  rooms: RoomData[];
  floors: FloorData[];
  onChange: (rooms: RoomData[]) => void;
}

const FINISH_DEFS = [
  { key: "floorFinishes" as const, label: "Plancher", options: FLOOR_FINISH_OPTIONS },
  { key: "wallFinishes" as const, label: "Murs", options: WALL_FINISH_OPTIONS },
  { key: "ceilingFinishes" as const, label: "Plafond", options: CEILING_FINISH_OPTIONS },
];

function FinishRow({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const shown = search ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options;
  return (
    <div className="flex min-h-[38px] items-center gap-2">
      <span className="w-20 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <button
        type="button"
        className="min-h-[36px] flex-1 truncate rounded border border-slate-200 px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-900/5 dark:border-slate-700 dark:text-slate-300"
        onClick={() => setOpen(true)}
      >
        {selected.length ? selected.join(", ") : <span className="text-slate-400">Choisir…</span>}
      </button>
      <BottomSheet open={open} title={`Revêtement — ${label.toLowerCase()}`} onClose={() => setOpen(false)}>
        <input
          type="search"
          className={`${inputSmCls} mb-2 w-full`}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-2">
          {shown.map((opt) => {
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
                  onChange={() => onChange(on ? selected.filter((s) => s !== opt) : [...selected, opt])}
                />
                {opt}
              </label>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

function RoomCard({
  room,
  floors,
  index,
  count,
  open,
  onToggle,
  onUpdate,
  onDuplicate,
  onRemove,
  onMove,
  onSaveAndAdd,
}: {
  room: RoomData;
  floors: FloorData[];
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<RoomData>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSaveAndAdd: () => void;
}) {
  const schema = getRoomSchema(room.type);
  const floorLabel = floors.find((f) => f.id === room.floorId)?.label;

  const setDim = (key: "width" | "depth" | "area", raw: string) => {
    const num = raw === "" ? undefined : Number(raw);
    const patch: Partial<RoomData> = { [key]: num };
    // aire calculée automatiquement quand largeur et profondeur sont saisies
    if (key !== "area") {
      const width = key === "width" ? num : room.width;
      const depth = key === "depth" ? num : room.depth;
      if (width !== undefined && depth !== undefined) {
        patch.area = Math.round(width * depth * 100) / 100;
      }
    }
    onUpdate(patch);
  };

  const essentialFields = (schema?.fields ?? []).filter((f) => (f.tier ?? "essential") === "essential");
  const detailFields = (schema?.fields ?? []).filter((f) => f.tier === "detail");
  const detailFilled = detailFields.filter((f) => isFilled(room.specific[f.id] as FieldValue)).length;

  return (
    <div className="rounded-md border border-slate-900/10 bg-white dark:border-slate-100/10 dark:bg-slate-900">
      <div className="flex min-h-[44px] items-center gap-1 px-2 py-1">
        <button type="button" onClick={onToggle} className="flex min-h-[36px] flex-1 items-center gap-2 text-left">
          <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {room.label || schema?.label || "Pièce"}
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            {[schema?.label, floorLabel, room.area !== undefined ? `${room.area} pi²` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </button>
        <button type="button" className={btnGhost} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Monter">
          ↑
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Descendre"
        >
          ↓
        </button>
        <button type="button" className={btnGhost} onClick={onDuplicate} title="Dupliquer">
          ⧉
        </button>
        <button type="button" className={btnDanger} onClick={onRemove} title="Supprimer">
          ✕
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-6">
            <label className="col-span-2 flex flex-col gap-1 md:col-span-2">
              <span className={labelCls}>Nom / libellé</span>
              <input
                type="text"
                className={inputSmCls}
                placeholder="ex. Chambre principale"
                value={room.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </label>
            <div className="col-span-2 flex flex-col gap-1 md:col-span-4">
              <span className={labelCls}>Étage</span>
              <div className="flex flex-wrap gap-1.5">
                {floors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={chipCls(room.floorId === f.id)}
                    onClick={() => {
                      onUpdate({ floorId: room.floorId === f.id ? undefined : f.id });
                      setLast("room_floor", f.id);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
                {floors.length === 0 && (
                  <span className="text-xs text-slate-400">Aucun étage défini (module « Étages »).</span>
                )}
              </div>
            </div>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className={labelCls}>Largeur (pi)</span>
              <input
                type="number"
                inputMode="decimal"
                className={inputSmCls}
                value={room.width ?? ""}
                onChange={(e) => setDim("width", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className={labelCls}>Profondeur (pi)</span>
              <input
                type="number"
                inputMode="decimal"
                className={inputSmCls}
                value={room.depth ?? ""}
                onChange={(e) => setDim("depth", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className={labelCls}>Aire (pi²) — auto L×P</span>
              <input
                type="number"
                inputMode="decimal"
                className={inputSmCls}
                value={room.area ?? ""}
                onChange={(e) => setDim("area", e.target.value)}
              />
            </label>
          </div>

          {/* Revêtements en lignes-résumé */}
          <div className="space-y-1">
            {FINISH_DEFS.map((d) => (
              <FinishRow
                key={d.key}
                label={d.label}
                options={d.options}
                selected={room[d.key]}
                onChange={(next) => onUpdate({ [d.key]: next })}
              />
            ))}
          </div>

          {essentialFields.length > 0 && (
            <FormRenderer
              fields={essentialFields}
              values={room.specific as Record<string, FieldValue>}
              onChange={(id, value) => onUpdate({ specific: { ...room.specific, [id]: value } })}
            />
          )}

          {detailFields.length > 0 && (
            <DetailsAccordion count={detailFilled}>
              <FormRenderer
                fields={detailFields}
                values={room.specific as Record<string, FieldValue>}
                onChange={(id, value) => onUpdate({ specific: { ...room.specific, [id]: value } })}
              />
            </DetailsAccordion>
          )}

          <label className="flex flex-col gap-1">
            <span className={labelCls}>Notes</span>
            <textarea
              className={`${inputSmCls} min-h-[56px] w-full`}
              rows={2}
              value={room.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            />
          </label>

          <div className="flex justify-end">
            <button type="button" className={btnSubtle} onClick={onSaveAndAdd}>
              Enregistrer et + 1 pièce
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomList({ rooms, floors, onChange }: RoomListProps) {
  const [pickerOpen, setPickerOpen] = useState(rooms.length === 0);
  const [openId, setOpenId] = useState<string | null>(null);

  const add = (typeId: string) => {
    const schema = getRoomSchema(typeId);
    const count = rooms.filter((r) => r.type === typeId).length;
    const id = uid();
    const lastFloor = getLast("room_floor");
    onChange([
      ...rooms,
      {
        id,
        type: typeId,
        label: count > 0 ? `${schema?.label ?? typeId} ${count + 1}` : schema?.label ?? typeId,
        floorId: floors.some((f) => f.id === lastFloor) ? lastFloor : undefined,
        floorFinishes: [],
        wallFinishes: [],
        ceilingFinishes: [],
        specific: {},
      },
    ]);
    setOpenId(id);
    setPickerOpen(false);
  };

  const update = (id: string, patch: Partial<RoomData>) =>
    onChange(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const duplicate = (room: RoomData) => {
    const idx = rooms.indexOf(room);
    const next = [...rooms];
    next.splice(idx + 1, 0, {
      ...room,
      id: uid(),
      label: `${room.label} (copie)`,
      specific: { ...room.specific },
      floorFinishes: [...room.floorFinishes],
      wallFinishes: [...room.wallFinishes],
      ceilingFinishes: [...room.ceilingFinishes],
    });
    onChange(next);
  };

  const remove = (id: string) => onChange(rooms.filter((r) => r.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = rooms.findIndex((r) => r.id === id);
    const to = idx + dir;
    if (to < 0 || to >= rooms.length) return;
    const next = [...rooms];
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {rooms.length} pièce{rooms.length > 1 ? "s" : ""}
        </span>
        <button type="button" onClick={() => setPickerOpen(!pickerOpen)} className={btnPrimary}>
          + Ajouter une pièce
        </button>
      </div>

      {pickerOpen && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950">
          {ROOM_SCHEMAS.map((r) => (
            <button key={r.id} type="button" onClick={() => add(r.id)} className={chipCls(false)}>
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            floors={floors}
            index={idx}
            count={rooms.length}
            open={openId === room.id}
            onToggle={() => setOpenId(openId === room.id ? null : room.id)}
            onUpdate={(patch) => update(room.id, patch)}
            onDuplicate={() => duplicate(room)}
            onRemove={() => remove(room.id)}
            onMove={(dir) => move(room.id, dir)}
            onSaveAndAdd={() => {
              setOpenId(null);
              setPickerOpen(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}
