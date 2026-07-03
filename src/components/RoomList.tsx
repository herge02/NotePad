"use client";

// Module « Relevé par pièce » : liste répétable de pièces. Le type de pièce
// détermine les champs spécifiques (roomSchemas). Les listes de revêtements
// réutilisent celles de la section « Finition intérieure » (schéma DRY).
// On documente présence, matériau, quantité, dimension — jamais l'état.

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
import type { FieldValue, FloorData, FormField, RoomData } from "@/lib/types";

export interface RoomListProps {
  rooms: RoomData[];
  floors: FloorData[];
  onChange: (rooms: RoomData[]) => void;
}

const cellInput =
  "w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-2 text-base " +
  "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

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
  onUpdate,
  onDuplicate,
  onRemove,
  onMove,
}: {
  room: RoomData;
  floors: FloorData[];
  index: number;
  count: number;
  onUpdate: (patch: Partial<RoomData>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(true);
  const schema = getRoomSchema(room.type);

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
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
        >
          <span className="text-lg">{open ? "▾" : "▸"}</span>
          <span className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {room.label || schema?.label || "Pièce"}
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300">
            {schema?.label}
          </span>
          {room.area !== undefined && (
            <span className="text-sm text-neutral-500">{room.area} pi²</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="min-h-[44px] w-11 rounded-xl border border-neutral-300 text-lg disabled:opacity-30 dark:border-neutral-600 dark:text-neutral-200"
          aria-label="Monter"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          className="min-h-[44px] w-11 rounded-xl border border-neutral-300 text-lg disabled:opacity-30 dark:border-neutral-600 dark:text-neutral-200"
          aria-label="Descendre"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm dark:border-neutral-600 dark:text-neutral-200"
        >
          Dupliquer
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-[44px] rounded-xl border border-red-300 px-3 text-sm text-red-600 dark:border-red-800"
        >
          Supprimer
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-neutral-100 p-4 dark:border-neutral-700">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <label>
              <span className="text-xs font-medium text-neutral-500">Type de pièce</span>
              <select
                className={cellInput}
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
            <label>
              <span className="text-xs font-medium text-neutral-500">Nom / libellé</span>
              <input
                type="text"
                className={cellInput}
                placeholder="ex. Chambre principale"
                value={room.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </label>
            <label>
              <span className="text-xs font-medium text-neutral-500">Étage rattaché</span>
              <select
                className={cellInput}
                value={room.floorId ?? ""}
                onChange={(e) => onUpdate({ floorId: e.target.value || undefined })}
              >
                <option value="">— Choisir —</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-neutral-500">Largeur (pi)</span>
              <input
                type="number"
                inputMode="decimal"
                className={cellInput}
                value={room.width ?? ""}
                onChange={(e) => setDim("width", e.target.value)}
              />
            </label>
            <label>
              <span className="text-xs font-medium text-neutral-500">Profondeur (pi)</span>
              <input
                type="number"
                inputMode="decimal"
                className={cellInput}
                value={room.depth ?? ""}
                onChange={(e) => setDim("depth", e.target.value)}
              />
            </label>
            <label>
              <span className="text-xs font-medium text-neutral-500">Aire (pi²) — auto si L×P</span>
              <input
                type="number"
                inputMode="decimal"
                className={cellInput}
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
            <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Champs spécifiques — {schema.label}
              </h4>
              <FormRenderer
                fields={schema.fields}
                values={room.specific as Record<string, FieldValue>}
                onChange={(id, value) => onUpdate({ specific: { ...room.specific, [id]: value } })}
              />
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-neutral-500">Notes</span>
            <textarea
              className={`${cellInput} min-h-[72px]`}
              value={room.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            />
          </label>

          <p className="text-xs text-neutral-400">Photos par pièce : prévues dans une version future.</p>
        </div>
      )}
    </div>
  );
}

export default function RoomList({ rooms, floors, onChange }: RoomListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const add = (typeId: string) => {
    const schema = getRoomSchema(typeId);
    const count = rooms.filter((r) => r.type === typeId).length;
    onChange([
      ...rooms,
      {
        id: uid(),
        type: typeId,
        label: count > 0 ? `${schema?.label ?? typeId} ${count + 1}` : schema?.label ?? typeId,
        floorFinishes: [],
        wallFinishes: [],
        ceilingFinishes: [],
        specific: {},
      },
    ]);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Pièces ({rooms.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Complète le relevé par étage — présence, matériau, quantité, dimension seulement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className="min-h-[44px] rounded-xl bg-blue-600 px-4 font-semibold text-white"
        >
          + Ajouter une pièce
        </button>
      </div>

      {pickerOpen && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          {ROOM_SCHEMAS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => add(r.id)}
              className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-4 text-base dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {rooms.length === 0 && !pickerOpen && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-600">
          Aucune pièce relevée. Touchez « Ajouter une pièce » puis choisissez le type — le formulaire
          affiche automatiquement les champs propres à l'usage de la pièce.
        </p>
      )}

      <div className="space-y-2">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            floors={floors}
            index={idx}
            count={rooms.length}
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
