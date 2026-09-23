import { describe, expect, it } from "vitest";
import { buildCleaningPdfInput } from "@/features/cleaning/pdf/build-cleaning-pdf-input";

const OPTS = {
  organizationName: "Congregación Norte",
  title: "Limpieza",
  colDate: "Fecha",
  periodFrom: "2026-09-10",
  periodTo: "2026-09-17",
  emptyCell: "Vacante",
  tasksHeading: "Tareas",
  noDescription: "Sin descripción",
  titleDefault: "Limpieza",
  filePrefix: "limpieza",
  sectorTasks: { patio: "Barrer el patio" },
};

describe("build-cleaning-pdf-input", () => {
  it("agrupa por data, ordena setores e resolve tarefas", () => {
    const input = buildCleaningPdfInput(
      [
        {
          assignmentDate: "2026-09-10",
          sectorKey: "salon",
          sectorName: "Salón",
          personName: "Ana",
          sortOrder: 2,
        },
        {
          assignmentDate: "2026-09-10",
          sectorKey: "patio",
          sectorName: "Patio",
          personName: "",
          sortOrder: 1,
        },
      ],
      OPTS,
    );
    expect(input.sectors.map((sector) => sector.name)).toEqual(["Patio", "Salón"]);
    expect(input.sectors[0]?.task).toBe("Barrer el patio");
    expect(input.sectors[1]?.task).toBeNull();
    expect(input.days).toHaveLength(1);
    expect(input.days[0]?.bySector).toEqual({ salon: ["Ana"], patio: ["Vacante"] });
    expect(input.fileName).toBe("limpieza-2026-09-10_2026-09-17.pdf");
    expect(input.i18n.periodLine).toBe("10/09 — 17/09");
  });
});
