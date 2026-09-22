import { describe, expect, it } from "vitest";
import {
  assignmentSummary,
  daysUntil,
  displayPartTitle,
  formatShortDay,
  formatWeekday,
  groupPartsBySection,
  helperRoleOf,
  type MyWeekPart,
  urgencyLabel,
} from "@/features/weekly-schedule/domain/my-week";

function part(overrides: Partial<MyWeekPart> = {}): MyWeekPart {
  return {
    partKey: "ministry-0",
    section: "SEAMOS MEJORES MAESTROS",
    title: "Haga revisitas",
    durationMinutes: 4,
    songNumber: null,
    isHelper: false,
    personName: "Antonio Pedro",
    helperPersonName: "",
    ...overrides,
  };
}

describe("my-week", () => {
  it("formata dia curto DD/MM", () => {
    expect(formatShortDay("2026-09-24")).toBe("24/09");
    expect(formatShortDay("2026-09-27")).toBe("27/09");
    expect(formatShortDay("invalida")).toBe("invalida");
  });

  it("define papel de lector só nos estudos", () => {
    expect(helperRoleOf("congregation-study")).toBe("lector");
    expect(helperRoleOf("watchtower-study")).toBe("lector");
    expect(helperRoleOf("ministry-0")).toBe("ayudante");
    expect(helperRoleOf("closing-song")).toBe("ayudante");
  });

  it("exibe cântico com y oración quando o título tem oração", () => {
    expect(displayPartTitle({ title: "Canción 129 y oración", songNumber: 129 })).toBe(
      "Canción 129 y oración",
    );
    expect(displayPartTitle({ title: "Canción 12", songNumber: 12 })).toBe("Canción 12");
    expect(displayPartTitle({ title: "Haga revisitas", songNumber: null })).toBe("Haga revisitas");
  });

  it("nomeia o dia da semana em espanhol", () => {
    expect(formatWeekday("2026-09-24")).toBe("jueves");
    expect(formatWeekday("2026-09-27")).toBe("domingo");
    expect(formatWeekday("invalida")).toBe("invalida");
  });

  it("calcula urgência em dias inteiros", () => {
    expect(daysUntil("2026-09-24", "2026-09-24")).toBe(0);
    expect(daysUntil("2026-09-20", "2026-09-24")).toBe(0);
    expect(daysUntil("2026-09-27", "2026-09-24")).toBe(3);
    expect(urgencyLabel("2026-09-24", "2026-09-24")).toBe("Hoy");
    expect(urgencyLabel("2026-09-25", "2026-09-24")).toBe("Mañana");
    expect(urgencyLabel("2026-09-27", "2026-09-24")).toBe("En 3 días");
  });

  it("resume a carga da pessoa em mensagem completa", () => {
    expect(assignmentSummary(0, 0)).toBe("Sin asignación");
    expect(assignmentSummary(1, 0)).toBe("1 parte");
    expect(assignmentSummary(2, 0)).toBe("2 partes");
    expect(assignmentSummary(2, 1)).toBe("2 partes · limpieza");
    expect(assignmentSummary(0, 1)).toBe("Limpieza");
  });

  it("agrupa partes por seção em ordem de aparição", () => {
    const groups = groupPartsBySection([
      part({ partKey: "treasures-talk", section: "TESOROS DE LA BIBLIA", title: "Discurso" }),
      part({ partKey: "ministry-0", title: "Haga revisitas" }),
      part({ partKey: "ministry-1", title: "Empiece conversaciones" }),
    ]);
    expect(groups.map((g) => g.section)).toEqual([
      "TESOROS DE LA BIBLIA",
      "SEAMOS MEJORES MAESTROS",
    ]);
    expect(groups[1]?.parts).toHaveLength(2);
  });
});
