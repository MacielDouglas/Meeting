"use client";

import { useState, useTransition } from "react";
import type { CleaningPdfAssignment } from "@/features/cleaning/pdf/build-cleaning-pdf-input";
import { buildCleaningPdfInput } from "@/features/cleaning/pdf/build-cleaning-pdf-input";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

interface DownloadCleaningPdfButtonProps {
  congregationName: string;
  periodFrom: string;
  periodTo: string;
  assignments: CleaningPdfAssignment[];
  /** Tarefas por sectorKey (da config de limpeza). */
  sectorTasks: Record<string, string>;
}

/** Botão de PDF da escala de limpeza (gera no cliente, como no AssignmentHub). */
export function DownloadCleaningPdfButton({
  congregationName,
  periodFrom,
  periodTo,
  assignments,
  sectorTasks,
}: DownloadCleaningPdfButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    startTransition(async () => {
      try {
        // Import dinâmico: jspdf só baixa quando o usuário gera o PDF.
        const { downloadCleaningPdf } = await import(
          "@/features/cleaning/pdf/download-cleaning-pdf"
        );
        const input = buildCleaningPdfInput(assignments, {
          organizationName: congregationName.trim() || es.appName,
          title: es.cleaning,
          colDate: es.colFecha,
          periodFrom,
          periodTo,
          emptyCell: es.vacante,
          tasksHeading: es.tareasPdf,
          noDescription: es.sinDescripcion,
          titleDefault: es.cleaning,
          filePrefix: "limpieza",
          sectorTasks,
        });
        downloadCleaningPdf(input);
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
        disabled={pending || assignments.length === 0}
        onClick={handleDownload}
      >
        {pending ? es.generandoPdf : es.pdfLimpieza}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
