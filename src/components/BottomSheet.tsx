"use client";

// Panneau coulissant du bas — pour les listes complètes (« Voir tout ») et les
// sélecteurs à la demande. Garde l'écran principal léger.

export default function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[80vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
          <button
            type="button"
            className="min-h-[40px] rounded-md px-3 text-sm font-medium text-blue-600"
            onClick={onClose}
          >
            Terminé
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
