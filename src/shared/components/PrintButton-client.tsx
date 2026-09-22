"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-11 rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink print:hidden"
    >
      Imprimir
    </button>
  );
}
