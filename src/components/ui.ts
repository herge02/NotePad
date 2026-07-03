// Classes utilitaires partagées — style compact inspiré de SPE-NotePad :
// bordures fines slate, petits contrôles natifs, accent bleu.

export const inputCls =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none " +
  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export const inputSmCls =
  "rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none " +
  "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export const checkCls = "h-5 w-5 shrink-0 accent-blue-600 cursor-pointer";

export const labelCls = "text-sm font-medium text-slate-700 dark:text-slate-300";

export const helpCls = "text-xs text-slate-500 dark:text-slate-400";

export const btnPrimary =
  "rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700";

export const btnSubtle =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 " +
  "hover:bg-slate-900/5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

export const btnGhost =
  "rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-900/5 " +
  "dark:text-slate-300 dark:hover:bg-slate-700";

export const btnDanger =
  "rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950";

export const cardCls =
  "rounded-md border border-slate-900/10 bg-white dark:border-slate-100/10 dark:bg-slate-800";

/** chip de choix rapide (tap = 1 action) */
export const chipCls = (active: boolean) =>
  `min-h-[36px] rounded-full border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-900/5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
  }`;

/** segmented Oui / Non */
export const segCls = (active: boolean) =>
  `min-h-[38px] min-w-[64px] px-3 text-sm font-medium first:rounded-l-md last:rounded-r-md border ${
    active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
  }`;

/** pastille de statut de module */
export const statusDot: Record<string, string> = {
  todo: "bg-slate-300 dark:bg-slate-600",
  "in-progress": "bg-amber-400",
  done: "bg-green-500",
  na: "bg-slate-200 dark:bg-slate-700",
};
