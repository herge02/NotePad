"use client";

// Écran de module : une tâche à la fois. Champs essentiels visibles,
// « Plus de détails » replié, matrices étage par étage, navigation
// Précédent / Suivant toujours sous le pouce.

import DetailsAccordion from "./DetailsAccordion";
import FloorCards from "./FloorCards";
import FormRenderer from "./FormRenderer";
import MatrixBlock from "./MatrixBlock";
import RepeatableList from "./RepeatableList";
import ReviewScreen, { type ReviewScreenProps } from "./ReviewScreen";
import RoomList from "./RoomList";
import { isFilled } from "@/lib/fieldLogic";
import { btnSubtle } from "./ui";
import type { FieldValue, ModuleDef, ReleveData } from "@/lib/types";

export interface ModuleScreenProps {
  module: ModuleDef;
  releve: ReleveData;
  setFieldValue: (fieldId: string, value: FieldValue) => void;
  updateReleve: (patch: Partial<ReleveData>) => void;
  setMatrixValue: (matrixId: string, floorId: string, option: string, pct: number | undefined) => void;
  setMatrixFloor: (matrixId: string, floorId: string, values: Record<string, number>) => void;
  saveState: "saved" | "saving" | "idle";
  prevLabel?: string;
  nextLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  review: Omit<ReviewScreenProps, "releve">;
}

export default function ModuleScreen({
  module,
  releve,
  setFieldValue,
  updateReleve,
  setMatrixValue,
  setMatrixFloor,
  saveState,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  review,
}: ModuleScreenProps) {
  const essential = (module.fields ?? []).filter((f) => (f.tier ?? "essential") === "essential");
  const detail = (module.fields ?? []).filter((f) => f.tier === "detail");
  const detailFilled = detail.filter((f) => isFilled(releve.values[f.id])).length;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5 p-3 pb-24 md:p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{module.title}</h2>
          {module.help && <p className="text-xs text-slate-500">{module.help}</p>}
        </div>

        {module.special === "floors" && (
          <FloorCards floors={releve.floors} onChange={(floors) => updateReleve({ floors })} />
        )}
        {module.special === "rooms" && (
          <RoomList rooms={releve.rooms} floors={releve.floors} onChange={(rooms) => updateReleve({ rooms })} />
        )}
        {module.special === "renovations" && (
          <RepeatableList
            renovations={releve.renovations}
            onChange={(renovations) => updateReleve({ renovations })}
          />
        )}
        {module.special === "summary" && <ReviewScreen releve={releve} {...review} />}

        {module.special !== "summary" && (
          <>
            {essential.length > 0 && (
              <FormRenderer fields={essential} values={releve.values} onChange={setFieldValue} />
            )}
            {module.matrices?.map((matrix) => (
              <MatrixBlock
                key={matrix.id}
                matrix={matrix}
                floors={releve.floors}
                values={releve.matrices[matrix.id] ?? {}}
                onChange={(floorId, option, pct) => setMatrixValue(matrix.id, floorId, option, pct)}
                onSetFloor={(floorId, vals) => setMatrixFloor(matrix.id, floorId, vals)}
              />
            ))}
            {detail.length > 0 && (
              <DetailsAccordion count={detailFilled}>
                <FormRenderer fields={detail} values={releve.values} onChange={setFieldValue} />
              </DetailsAccordion>
            )}
          </>
        )}
      </div>

      {/* Navigation collée en bas */}
      <div className="sticky bottom-0 z-40 flex items-center gap-2 border-t border-slate-900/10 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-100/10 dark:bg-slate-900/95">
        <button type="button" className={btnSubtle} onClick={onPrev}>
          ‹ {prevLabel ?? "Retour"}
        </button>
        <span
          className={`flex-1 text-center text-xs ${
            saveState === "saved" ? "text-green-600" : "text-slate-400"
          }`}
        >
          {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "✓ Sauvegardé" : ""}
        </span>
        <button
          type="button"
          className="min-h-[44px] rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          onClick={onNext}
        >
          {nextLabel ?? "Suivant"} ›
        </button>
      </div>
    </div>
  );
}
