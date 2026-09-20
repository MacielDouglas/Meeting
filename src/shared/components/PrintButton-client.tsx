"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 rounded-full bg-sky-500 px-4 text-sm font-medium text-white print:hidden"
    >
      Imprimir
    </button>
  );
}
