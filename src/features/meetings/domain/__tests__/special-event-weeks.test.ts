import { describe, expect, it } from "vitest";
import {
  blocksMeeting,
  formatEventRange,
  mondayOfISO,
  noticeForDate,
  resolveWeekOverrides,
  toVisitDetails,
  type WeekMeetings,
} from "@/features/meetings/domain/special-event-weeks";
import type { SpecialEventItem } from "@/features/settings/application/queries";

const WEEK: WeekMeetings = {
  weekStart: "2026-09-21",
  weekEnd: "2026-09-27",
  midweekDate: "2026-09-24",
  weekendDate: "2026-09-27",
};

function event(
  type: SpecialEventItem["type"],
  startDate: string,
  overrides: Partial<SpecialEventItem> = {},
): SpecialEventItem {
  return {
    id: `${type}-${startDate}`,
    type,
    title: type,
    startDate,
    endDate: null,
    startTime: "09:00",
    notes: null,
    speakerName: null,
    midweekTheme: null,
    publicTalkTheme: null,
    finalTalkTheme: null,
    ...overrides,
  };
}

describe("resolveWeekOverrides", () => {
  it("devolve none sem eventos", () => {
    expect(resolveWeekOverrides(WEEK, [])).toEqual({
      midweek: { kind: "none" },
      weekend: { kind: "none" },
    });
  });

  it("ignora tipo other", () => {
    const result = resolveWeekOverrides(WEEK, [event("other", "2026-09-23")]);
    expect(result.midweek.kind).toBe("none");
    expect(result.weekend.kind).toBe("none");
  });

  it("asamblea de um dia cancela as duas reuniões", () => {
    const assembly = event("regional_assembly", "2026-09-26", { endDate: "2026-09-28" });
    const result = resolveWeekOverrides(WEEK, [assembly]);
    expect(result.midweek).toEqual({ kind: "assembly", event: assembly });
    expect(result.weekend).toEqual({ kind: "assembly", event: assembly });
  });

  it("asamblea fora da semana não afeta", () => {
    const result = resolveWeekOverrides(WEEK, [event("circuit_assembly", "2026-09-14")]);
    expect(result.midweek.kind).toBe("none");
    expect(result.weekend.kind).toBe("none");
  });

  it("asamblea vale na borda do intervalo", () => {
    const result = resolveWeekOverrides(WEEK, [event("representative_assembly", "2026-09-27")]);
    expect(result.midweek.kind).toBe("assembly");
    expect(result.weekend.kind).toBe("assembly");
  });

  it("celebración cancela só a reunião da própria data", () => {
    const memorial = event("memorial", "2026-09-24");
    const result = resolveWeekOverrides(WEEK, [memorial]);
    expect(result.midweek).toEqual({ kind: "celebration", event: memorial });
    expect(result.weekend.kind).toBe("none");
  });

  it("celebración no fim de semana cancela só o fim de semana", () => {
    const result = resolveWeekOverrides(WEEK, [event("memorial", "2026-09-27")]);
    expect(result.midweek.kind).toBe("none");
    expect(result.weekend.kind).toBe("celebration");
  });

  it("celebración com intervalo pega as duas quando cobre ambas", () => {
    const memorial = event("memorial", "2026-09-24", { endDate: "2026-09-27" });
    const result = resolveWeekOverrides(WEEK, [memorial]);
    expect(result.midweek.kind).toBe("celebration");
    expect(result.weekend.kind).toBe("celebration");
  });

  it("visita ajusta as duas sem cancelar", () => {
    const visit = event("circuit_visit", "2026-09-22", {
      endDate: "2026-09-27",
      speakerName: "Hno. Pérez",
      midweekTheme: "Tema 1",
      publicTalkTheme: "Tema 2",
      finalTalkTheme: "Tema 3",
    });
    const result = resolveWeekOverrides(WEEK, [visit]);
    expect(result.midweek).toEqual({
      kind: "circuit-visit",
      event: visit,
      visit: {
        speakerName: "Hno. Pérez",
        midweekTheme: "Tema 1",
        publicTalkTheme: "Tema 2",
        finalTalkTheme: "Tema 3",
      },
    });
    expect(result.weekend.kind).toBe("circuit-visit");
  });

  it("discurso especial vai para a reunião mais próxima", () => {
    const talk = event("special_talk", "2026-09-26");
    const result = resolveWeekOverrides(WEEK, [talk]);
    expect(result.midweek.kind).toBe("none");
    expect(result.weekend).toEqual({ kind: "special-talk", event: talk });
  });

  it("discurso especial empata para o meio de semana", () => {
    // 22 está a 2 dias do meio (24) e a 5 do fim (27); uso 25/26 equidistantes:
    // 2026-09-25 está a 1 do meio (24) e a 2 do fim (27). Para empate real,
    // semana com reuniões em 24 e 26 e discurso dia 25.
    const week: WeekMeetings = { ...WEEK, weekendDate: "2026-09-26" };
    const talk = event("special_talk", "2026-09-25");
    const result = resolveWeekOverrides(week, [talk]);
    expect(result.midweek).toEqual({ kind: "special-talk", event: talk });
    expect(result.weekend.kind).toBe("none");
  });

  it("dois discursos: cada um na sua reunião mais próxima", () => {
    const early = event("special_talk", "2026-09-21");
    const late = event("special_talk", "2026-09-27");
    const result = resolveWeekOverrides(WEEK, [early, late]);
    expect(result.midweek).toEqual({ kind: "special-talk", event: early });
    expect(result.weekend).toEqual({ kind: "special-talk", event: late });
  });

  it("asamblea prevalece sobre visita e discurso na mesma semana", () => {
    const result = resolveWeekOverrides(WEEK, [
      event("circuit_visit", "2026-09-22", { endDate: "2026-09-27" }),
      event("special_talk", "2026-09-24"),
      event("regional_assembly", "2026-09-26", { endDate: "2026-09-28" }),
    ]);
    expect(result.midweek.kind).toBe("assembly");
    expect(result.weekend.kind).toBe("assembly");
  });

  it("celebración prevalece sobre a visita na data", () => {
    const result = resolveWeekOverrides(WEEK, [
      event("circuit_visit", "2026-09-22", { endDate: "2026-09-27" }),
      event("memorial", "2026-09-24"),
    ]);
    expect(result.midweek.kind).toBe("celebration");
    expect(result.weekend.kind).toBe("circuit-visit");
  });
});

describe("toVisitDetails", () => {
  it("usa nome genérico quando faltam detalhes", () => {
    expect(toVisitDetails(event("circuit_visit", "2026-09-22"))).toEqual({
      speakerName: "Superintendente de Circuito",
      midweekTheme: "",
      publicTalkTheme: "",
      finalTalkTheme: "",
    });
  });
});

describe("blocksMeeting", () => {
  it("bloqueia asamblea e celebración; libera o resto", () => {
    const assembly = event("regional_assembly", "2026-09-26");
    const memorial = event("memorial", "2026-09-24");
    const visit = event("circuit_visit", "2026-09-22");
    const talk = event("special_talk", "2026-09-24");
    expect(blocksMeeting({ kind: "assembly", event: assembly })).toBe(true);
    expect(blocksMeeting({ kind: "celebration", event: memorial })).toBe(true);
    expect(
      blocksMeeting({ kind: "circuit-visit", event: visit, visit: toVisitDetails(visit) }),
    ).toBe(false);
    expect(blocksMeeting({ kind: "special-talk", event: talk })).toBe(false);
    expect(blocksMeeting({ kind: "none" })).toBe(false);
  });
});

describe("formatEventRange", () => {
  it("um dia", () => {
    expect(formatEventRange("2026-09-12", null)).toBe("12 de septiembre de 2026");
    expect(formatEventRange("2026-09-12", "2026-09-12")).toBe("12 de septiembre de 2026");
  });

  it("intervalo no mesmo mês", () => {
    expect(formatEventRange("2026-09-12", "2026-09-14")).toBe("12 al 14 de septiembre de 2026");
  });

  it("intervalo entre meses", () => {
    expect(formatEventRange("2026-09-28", "2026-10-02")).toBe(
      "28 de septiembre al 2 de octubre de 2026",
    );
  });

  it("intervalo entre anos", () => {
    expect(formatEventRange("2026-12-28", "2027-01-02")).toBe(
      "28 de diciembre de 2026 al 2 de enero de 2027",
    );
  });
});

describe("mondayOfISO", () => {
  it("volta à segunda da semana", () => {
    expect(mondayOfISO("2026-09-21")).toBe("2026-09-21");
    expect(mondayOfISO("2026-09-24")).toBe("2026-09-21");
    expect(mondayOfISO("2026-09-27")).toBe("2026-09-21");
    expect(mondayOfISO("2026-09-28")).toBe("2026-09-28");
  });
});

describe("noticeForDate", () => {
  const weekStart = "2026-09-21";

  it("nulo sem eventos", () => {
    expect(noticeForDate("2026-09-24", weekStart, [])).toBeNull();
  });

  it("asamblea da semana", () => {
    const assembly = event("regional_assembly", "2026-09-26", { endDate: "2026-09-28" });
    expect(noticeForDate("2026-09-24", weekStart, [assembly])).toEqual({
      variant: "assembly",
      event: assembly,
    });
  });

  it("celebración na data", () => {
    const memorial = event("memorial", "2026-09-24");
    expect(noticeForDate("2026-09-24", weekStart, [memorial])?.variant).toBe("celebration");
    expect(noticeForDate("2026-09-27", weekStart, [memorial])).toBeNull();
  });

  it("visita da semana", () => {
    const visit = event("circuit_visit", "2026-09-22", { endDate: "2026-09-27" });
    expect(noticeForDate("2026-09-24", weekStart, [visit])?.variant).toBe("circuit-visit");
  });

  it("discurso especial só na data exata", () => {
    const talk = event("special_talk", "2026-09-23");
    expect(noticeForDate("2026-09-23", weekStart, [talk])?.variant).toBe("special-talk");
    expect(noticeForDate("2026-09-24", weekStart, [talk])).toBeNull();
  });

  it("asamblea prevalece", () => {
    const assembly = event("regional_assembly", "2026-09-26", { endDate: "2026-09-28" });
    const memorial = event("memorial", "2026-09-24");
    expect(noticeForDate("2026-09-24", weekStart, [memorial, assembly])?.variant).toBe("assembly");
  });
});
