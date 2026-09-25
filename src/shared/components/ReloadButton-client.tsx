"use client";

import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

/** Ilha mínima: tenta recarregar quando a rede voltar. */
export function ReloadButton() {
  return (
    <Button variant="outline" onClick={() => window.location.reload()}>
      {es.reintentar}
    </Button>
  );
}
