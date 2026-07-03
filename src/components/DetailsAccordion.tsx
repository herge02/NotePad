"use client";

// « Plus de détails » — divulgation progressive du niveau b) : replié par
// défaut, un tap pour l'ouvrir.

import { useState } from "react";

export default function DetailsAccordion({
  title = "Plus de détails",
  count,
  children,
}: {
  title?: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        className="flex min-h-[42px] w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {count}
            </span>
          )}
        </span>
        <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="border-t border-slate-100 p-3 dark:border-slate-800">{children}</div>}
    </div>
  );
}
