import { describe, expect, it } from "vitest";
import { buildDutyPdfInput } from "@/features/meeting-duties/pdf/build-duty-pdf-input";

const OPTS = {
  organizationName: "Congregación Norte",
  title: "En la reunión",
  colDate: "Fecha",
  emptyCell: "Vacante",
  internoLabel: "Interno",
  externoLabel: "Externo",
  filePrefix: "en-la-reunion",
};

describe("build-duty-pdf-input", () => {
  it("ordena as colunas na ordem canônica mesmo com entrada embaralhada", () => {
    const input = buildDutyPdfInput(
      [
        {
          date: "2026-09-10",
          slots: [
            { dutyKey: "video", dutyName: "Vídeo", side: null, personName: "Vic" },
            { dutyKey: "usher", dutyName: "Acomodadores", side: "externo", personName: "Ext" },
            { dutyKey: "usher", dutyName: "Acomodadores", side: "interno", personName: "Int" },
            { dutyKey: "sound", dutyName: "Som", side: null, personName: "Son" },
            { dutyKey: "microphone", dutyName: "Microfone", side: null, personName: "Mic" },
          ],
        },
      ],
      "2026-09-10",
      "2026-09-10",
      OPTS,
    );
    expect(input.head).toEqual([
      [
        { content: "Fecha", rowSpan: 2 },
        { content: "Acomodadores", colSpan: 2 },
        { content: "Microfone", rowSpan: 2 },
        { content: "Som", rowSpan: 2 },
        { content: "Vídeo", rowSpan: 2 },
      ],
      [{ content: "Externo" }, { content: "Interno" }],
    ]);
    expect(input.rows[0]?.cells).toEqual(["Ext", "Int", "Mic", "Son", "Vic"]);
    expect(input.fileName).toBe("en-la-reunion-2026-09-10_2026-09-10.pdf");
  });

  it("usa cabeçalho simples sem acomodador e preenche vazio", () => {
    const input = buildDutyPdfInput(
      [
        {
          date: "2026-09-13",
          slots: [{ dutyKey: "sound", dutyName: "Som", side: null, personName: "" }],
        },
      ],
      "2026-09-13",
      "2026-09-13",
      OPTS,
    );
    expect(input.head).toEqual([["Fecha", "Som"]]);
    expect(input.rows[0]?.cells).toEqual(["Vacante"]);
    expect(input.periodLine).toBe("13/09 — 13/09 de 2026");
  });
});
