"use client";

// Section repliable avec animation de hauteur (style SPE-NotePad).
// Contrôlée de l'extérieur (open/onToggle) pour que la sidebar puisse ouvrir
// et faire défiler vers une section.

import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  /** pastille de progression : la section contient des données */
  started?: boolean;
  children: React.ReactNode;
};

export default function CollapsibleSection({ title, subtitle, open, onToggle, started, children }: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState(0);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setMaxH(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-md border border-slate-900/10 bg-white dark:border-slate-100/10 dark:bg-slate-900">
      <button
        type="button"
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-900/5 dark:hover:bg-slate-800"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            started ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          aria-hidden
        />
        <span className="flex-1 truncate">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
          {subtitle && <span className="ml-2 text-xs text-slate-500">{subtitle}</span>}
        </span>
        <svg
          className={`h-4 w-4 flex-none text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="overflow-hidden px-3"
        style={{ maxHeight: open ? maxH : 0, transition: "max-height 220ms ease" }}
      >
        <div ref={innerRef} className="pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}
