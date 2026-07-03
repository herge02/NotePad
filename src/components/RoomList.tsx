"use client";

// Module « Relevé par pièce », version compacte : chaque pièce est une carte
// repliable fine (nom, type, aire) ; ouverte, elle expose les champs communs
// en grille serrée, les revêtements (listes DRY de la section 8) et les champs
// spécifiques au type. On documente présence/matériau/quantité/dimension.

import { useState } from "react";
import FormRenderer from "./FormRenderer";
import {
  CEILING_FINISH_OPTIONS,
  FLOOR_FINISH_OPTIONS,
  ROOM_SCHEMAS,
  WALL_FINISH_OPTIONS,
  getRoomSchema,
} from "@/lib/formSchema";
import { uid } from "@/lib/uid";
import { btnDanger, btnGhost, btnPrimary, btnSubtle, inputSmCls, labelCls } from "./ui";
import type { FieldValue, FloorData, FormField, RoomData } from "@/lib/types";

export interface RoomListProps {
  rooms: RoomData[];
  floors: FloorData[];
  onChange: (rooms: RoomData[]) => void;
}

// champs communs « revêtements » construits à partir des listes partagées
const FINISH_FIELDS: FormField[] = [
  { id: "floorFinishes", label: "Revêtement plancher", type: "checkbox-group", options: FLOOR_FINISH_OPTIONS },
  { id: "wallFinishes", label: "Revêtement murs", type: "checkbox-group", options: WALL_FINISH_OPTIONS },
  { id: "ceilingFinishes", label: "Revêtement plafond", type: "checkbox-group", options: CEILING_FINISH_OPTIONS },
];

function RoomCard({
  room,
  floors,
  index,
  count,
  defaultOpen,
  onUpdate,
  onDuplicate,
  onRemove,
  onMove,
}: {
  room: RoomData;
  floors: FloorData[];
  index: number;
  count: number;
  defaultOpen: boolean;
  onUpdate: (patch: Partial<RoomData>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

  const finishValues: Record<string, FieldValue> = {
    floorFinishes: room.floorFinishes,
    wallFinishes: room.wallFinishes,
    ceilingFinishes: room.ceilingFinishes,
  };

  return (
    <div className="rounded-md border border-slate-900/10 bg-white dark:border-slate-100/10 dark:bg-slate-900">
      <div className="flex min-h-[44px] items-center gap-1 px-2 py-1">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[36px] flex-1 items-center gap-2 text-left">
          <svg
            className={`h-4 w-4 flex-none text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {room.label || schema?.label || "Pièce"}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {schema?.label}
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            {[floorLabel, room.area !== undefined ? `${room.area} pi²` : null].filter(Boolean).join(" · ")}
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
              <span className={labelCls}>Type de pièce</span>
              <select
                className={inputSmCls}
                value={room.type}
                onChange={(e) => onUpdate({ type: e.target.value, specific: {} })}
              >
                {ROOM_SCHEMAS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="col-span-2 flex flex-col gap-1 md:col-span-2">
              <span className={labelCls}>Étage</span>
              <select
                className={inputSmCls}
                value={room.floorId ?? ""}
                onChange={(e) => onUpdate({ floorId: e.target.value || undefined })}
              >
                <option value="">—</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
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

          <FormRenderer
            fields={FINISH_FIELDS}
            values={finishValues}
            onChange={(id, value) => onUpdate({ [id]: (value as string[]) ?? [] })}
          />

          {schema && schema.fields.length > 0 && (
            <div className="rounded border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {schema.label}
              </div>
              <FormRenderer
                fields={schema.fields}
                values={room.specific as Record<string, FieldValue>}
                onChange={(id, value) => onUpdate({ specific: { ...room.specific, [id]: value } })}
              />
            </div>
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
        </div>
      )}
    </div>
  );
}

export default function RoomList({ rooms, floors, onChange }: RoomListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const add = (typeId: string) => {
    const schema = getRoomSchema(typeId);
    const count = rooms.filter((r) => r.type === typeId).length;
    const id = uid();
    onChange([
      ...rooms,
      {
        id,
        type: typeId,
        label: count > 0 ? `${schema?.label ?? typeId} ${count + 1}` : schema?.label ?? typeId,
        floorFinishes: [],
        wallFinishes: [],
        ceilingFinishes: [],
        specific: {},
      },
    ]);
    setLastAddedId(id);
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
        <span className="text-xs text-slate-500">
          {rooms.length} pièce{rooms.length > 1 ? "s" : ""} — complète le relevé par étage.
        </span>
        <button type="button" onClick={() => setPickerOpen(!pickerOpen)} className={btnPrimary}>
          + Ajouter une pièce
        </button>
      </div>

      {pickerOpen && (
        <div className="flex flex-wrap gap-1.5 rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950">
          {ROOM_SCHEMAS.map((r) => (
            <button key={r.id} type="button" onClick={() => add(r.id)} className={btnSubtle}>
              {r.label}
            </button>
          ))}
        </div>
      )}

      {rooms.length === 0 && !pickerOpen && (
        <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
          Aucune pièce. « Ajouter une pièce » puis choisir le type — les champs propres à l'usage
          s'affichent automatiquement.
        </p>
      )}

      <div className="space-y-1.5">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            floors={floors}
            index={idx}
            count={rooms.length}
            defaultOpen={room.id === lastAddedId}
            onUpdate={(patch) => update(room.id, patch)}
            onDuplicate={() => duplicate(room)}
            onRemove={() => remove(room.id)}
            onMove={(dir) => move(room.id, dir)}
          />
        ))}
      </div>
    </div>
  );
}
