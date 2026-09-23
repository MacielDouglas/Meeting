"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { es } from "@/shared/i18n/es";
import type { CleaningPdfInput } from "./cleaning-pdf-types";

function formatDateLabel(iso: string, weekdays: readonly string[], emptyCell: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso || emptyCell;
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (Number.isNaN(dt.getTime())) return iso;
  return `${match[3]}/${match[2]}/${match[1]} ${weekdays[dt.getDay()] ?? ""}`.trim();
}

function cellNames(names: string[] | undefined, emptyCell: string): string {
  if (!names || names.length === 0) return emptyCell;
  return names.join(" - ");
}

export function downloadCleaningPdf(input: CleaningPdfInput): void {
  const i18n = input.i18n;

  if (input.sectors.length === 0) {
    throw new Error(es.pdfSinDatos);
  }
  if (input.days.length === 0) {
    throw new Error(es.pdfSinDatos);
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 8;
  const marginBottom = 14;
  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(input.organizationName, pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(14);
  doc.text(input.title, pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(i18n.periodLine, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 4;

  const head = [i18n.colDate, ...input.sectors.map((sector) => sector.name)];
  const body = input.days.map((day) => [
    formatDateLabel(day.date, i18n.weekdays, i18n.emptyCell),
    ...input.sectors.map((sector) => cellNames(day.bySector[sector.id], i18n.emptyCell)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2,
      valign: "middle",
      halign: "center",
      overflow: "linebreak",
      lineColor: [30, 30, 30],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: {
        cellWidth: 42,
        fontStyle: "bold",
        halign: "center",
        fillColor: [248, 250, 252],
      },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    margin: {
      left: marginX,
      right: marginX,
      top: 10,
      bottom: marginBottom,
    },
  });

  const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let cursorY = (lastAutoTable?.finalY ?? y) + 8;
  const maxWidth = pageW - marginX * 2;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageH - marginBottom) {
      doc.addPage();
      cursorY = 14;
    }
  };

  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text(i18n.tasksHeading, marginX, cursorY);
  cursorY += 5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, marginX + 42, cursorY);
  cursorY += 5;

  for (const sector of input.sectors) {
    const task = sector.task && sector.task.length > 0 ? sector.task : i18n.noDescription;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(sector.name, maxWidth) as string[];
    const nameBlockH = nameLines.length * 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const taskLines = doc.splitTextToSize(task, maxWidth) as string[];
    const taskBlockH = taskLines.length * 3.6;
    ensureSpace(nameBlockH + taskBlockH + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(nameLines, marginX, cursorY);
    cursorY += nameBlockH + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(taskLines, marginX, cursorY);
    cursorY += taskBlockH + 3;
  }

  doc.setTextColor(0);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${input.organizationName}  ${i}/${pageCount}`, pageW / 2, pageH - 6, {
      align: "center",
    });
    doc.setTextColor(0);
  }

  const safeName = input.fileName.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");

  doc.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}
