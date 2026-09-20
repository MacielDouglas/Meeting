"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  type AnyInspectResult,
  inspectAnyJwpub,
} from "@/features/meeting-content/application/actions";
import { WatchtowerImportModal } from "@/features/meeting-content/presentation/WatchtowerSection";
import { WorkbookImportModal } from "@/features/meeting-content/presentation/WorkbookSection";
import { Button } from "@/shared/components/ui/button";

type SmartInspected = Extract<AnyInspectResult, { ok: true }>;

/**
 * Botão de importação de .jwpub (apostila ou Sentinela) para exibir nos
 * estados de "programação não encontrada". Após salvar, atualiza a página
 * para recarregar o programa da semana.
 */
export function JwpubImportButton({ label = "Importar .jwpub" }: { label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<SmartInspected | null>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await inspectAnyJwpub(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInspected(result);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSaved() {
    setInspected(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept=".jwpub"
        aria-label="Arquivo .jwpub (apostila ou Sentinela)"
        className="hidden"
        onChange={(event) => void handleFileSelected(event.target.files?.[0])}
      />
      <div>
        <Button disabled={reading} onClick={() => fileRef.current?.click()}>
          {reading ? "Lendo arquivo…" : label}
        </Button>
      </div>
      {inspected && inspected.kind === "workbook" && (
        <WorkbookImportModal
          inspected={inspected}
          onClose={() => setInspected(null)}
          onSaved={() => handleSaved()}
        />
      )}
      {inspected && inspected.kind === "watchtower" && (
        <WatchtowerImportModal
          inspected={inspected}
          onClose={() => setInspected(null)}
          onSaved={() => handleSaved()}
        />
      )}
      {inspected && (inspected.kind === "songs" || inspected.kind === "outlines") && (
        <p className="text-sm text-muted-foreground">
          Este arquivo é de {inspected.kind === "songs" ? "cânticos" : "esboços"}. Importe na{" "}
          <Link href="/reunioes?tab=conteudo" className="text-sky-600 underline">
            aba Conteúdo
          </Link>
          .
        </p>
      )}
    </div>
  );
}
