"use client";

import { useState, useTransition } from "react";
import { buildDutyPdfInput } from "@/features/meeting-duties/pdf/build-duty-pdf-input";
import type { DutyPdfDay } from "@/features/meeting-duties/pdf/duty-pdf-types";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

interface DownloadDutyPdfButtonProps {
  congregationName: string;
  periodFrom: string;
  periodTo: string;
  days: DutyPdfDay[];
}

/** Botão de PDF da escala En la reunión (gera no cliente, como no AssignmentHub). */
export function DownloadDutyPdfButton({
  congregationName,
  periodFrom,
  periodTo,
  days,
}: DownloadDutyPdfButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    startTransition(async () => {
      try {
        // Import dinâmico: jspdf só baixa quando o usuário gera o PDF.
        const { downloadDutyPdf } = await import("@/features/meeting-duties/pdf/download-duty-pdf");
        const input = buildDutyPdfInput(days, periodFrom, periodTo, {
          organizationName: congregationName.trim() || es.appName,
          title: es.pdfAsignaciones,
          colDate: es.colFecha,
          emptyCell: es.sinAsignar,
          internoLabel: es.interno,
          externoLabel: es.externo,
          filePrefix: "en-la-reunion",
        });
        downloadDutyPdf(input);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : es.pdfError);
      }
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || days.length === 0}
        onClick={handleDownload}
      >
        {pending ? es.generandoPdf : es.pdfReunion}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
