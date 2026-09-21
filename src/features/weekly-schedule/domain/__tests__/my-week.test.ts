import { describe, expect, it } from "vitest";
import {
  displayPartTitle,
  formatShortDay,
  groupPartsBySection,
  helperRoleOf,
  type MyWeekPart,
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
