"use client";

// Hub d'une phase : cartes de modules avec statut (la carte dit quoi faire),
// questions opt-in en une ligne, bouton « Continuer → prochaine tâche »,
// et modules « sans objet » réactivables.

import DetailsAccordion from "./DetailsAccordion";
import { modulesOfPhase } from "@/lib/formSchema";
import {
  isUnansweredOptIn,
  moduleAnomalies,
  moduleStatus,
  moduleSummary,
  nextTask,
} from "@/lib/fieldLogic";
import { segCls, statusDot } from "./ui";
import type { ModuleDef, Phase, ReleveData } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  todo: "À faire",
  "in-progress": "En cours",
  done: "Complet",
  na: "Sans objet",
};

export default function ModuleHub({
  phase,
  releve,
  onOpen,
  onAnswerOptIn,
  onReactivate,
}: {
  phase: Phase;
  releve: ReleveData;
  onOpen: (moduleId: string) => void;
  onAnswerOptIn: (m: ModuleDef, answer: "oui" | "non") => void;
  onReactivate: (m: ModuleDef) => void;
}) {
  const modules = modulesOfPhase(phase);
  const next = nextTask(releve);

  const cards = modules.filter((m) => moduleStatus(m, releve) !== "na" && !isUnansweredOptIn(m, releve));
  const questions = modules.filter((m) => isUnansweredOptIn(m, releve));
  const naModules = modules.filter(
    (m) => moduleStatus(m, releve) === "na" && !isUnansweredOptIn(m, releve)
  );

  return (
    <div className="space-y-3">
      {next && (
        <button
          type="button"
          onClick={() => onOpen(next.id)}
          className="flex min-h-[52px] w-full items-center justify-between rounded-lg bg-blue-600 px-4 text-left text-white shadow-sm hover:bg-blue-700"
        >
          <span>
            <span className="block text-xs text-blue-100">Continuer</span>
            <span className="text-sm font-semibold">{next.title}</span>
          </span>
          <span className="text-xl">→</span>
        </button>
      )}

      <div className="space-y-1.5">
        {cards.map((m) => {
          const st = moduleStatus(m, releve);
          const anomalies = moduleAnomalies(m, releve);
          const summary = moduleSummary(m, releve);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpen(m.id)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-md border border-slate-900/10 bg-white px-3 py-2 text-left hover:bg-slate-900/5 dark:border-slate-100/10 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot[st]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {m.title}
                </span>
                {(summary || anomalies.length > 0) && (
                  <span className="block truncate text-xs text-slate-500">
                    {anomalies.length > 0 ? (
                      <span className="font-medium text-red-600">
                        ⚠ {anomalies.length} anomalie{anomalies.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      summary
                    )}
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                  st === "done"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                    : st === "in-progress"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {STATUS_LABEL[st]}
              </span>
              <span className="text-slate-300">›</span>
            </button>
          );
        })}
      </div>

      {questions.length > 0 && (
        <div className="rounded-md border border-slate-900/10 bg-white p-3 dark:border-slate-100/10 dark:bg-slate-900">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Présent sur ce dossier ?
          </div>
          <div className="space-y-1.5">
            {questions.map((m) => (
              <div key={m.id} className="flex min-h-[40px] items-center gap-2">
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  {m.optIn!.question}
                </span>
                <div className="inline-flex">
                  <button type="button" className={segCls(false)} onClick={() => onAnswerOptIn(m, "oui")}>
                    Oui
                  </button>
                  <button type="button" className={segCls(false)} onClick={() => onAnswerOptIn(m, "non")}>
                    Non
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {naModules.length > 0 && (
        <DetailsAccordion title="Modules sans objet">
          <div className="space-y-1">
            {naModules.map((m) => (
              <div key={m.id} className="flex min-h-[38px] items-center gap-2">
                <span className="flex-1 text-sm text-slate-500">{m.title}</span>
                <button
                  type="button"
                  className="min-h-[36px] rounded-md px-2 text-sm text-blue-600"
                  onClick={() => onReactivate(m)}
                >
                  Réactiver
                </button>
              </div>
            ))}
          </div>
        </DetailsAccordion>
      )}
    </div>
  );
}
