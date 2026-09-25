"use client";

import { es } from "@/shared/i18n/es";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-11 rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden"
    >
      {es.imprimir}
    </button>
  );
}
