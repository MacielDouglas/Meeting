import { describe, expect, it } from "vitest";
import {
  type AssignmentInput,
  analyzeDays,
  generateCleaningAssignments,
  validateWeeklyConstraint,
} from "@/features/cleaning/domain/assign-cleaning";
import type {
  ScheduleExceptionItem,
  SpecialEventItem,
} from "@/features/settings/application/queries";

type InputPerson = AssignmentInput["persons"][number];
type InputSector = AssignmentInput["sectors"][number];

function person(id: string, overrides: Partial<InputPerson> = {}): InputPerson {
  return {
    id,
    firstName: id,
    lastName: "T",
    sex: "male",
    cleaning: true,
    young: false,
    familyHead: false,
    familyMemberId: null,
    ...overrides,
  };
}

function sector(key: string, overrides: Partial<InputSector> = {}): InputSector {
  return {
    key,
    name: key,
    peopleCount: 1,
    requiredSex: "any",
    allowYoung: true,
    ...overrides,
  };
}

function assemblyEvent(type: SpecialEventItem["type"], startDate: string): SpecialEventItem {
  return {
    id: `${type}-${startDate}`,
    type,
    title: type,
    startDate,
    endDate: startDate,
    startTime: "09:00",
    notes: null,
    speakerName: null,
    midweekTheme: null,
    publicTalkTheme: null,
    finalTalkTheme: null,
  };
}

function baseInput(overrides: Partial<AssignmentInput> = {}): AssignmentInput {
  return {
    typeKey: "per_meeting",
    startDate: "2026-09-01",
    endDate: "2026-09-06",
    sectors: [sector("auditorio", { peopleCount: 2 })],
    persons: [person("a1"), person("a2"), person("a3"), person("a4")],
    midweekDay: 2,
    weekendDay: 0,
    specialEvents: [],
    scheduleExceptions: [],
    ...overrides,
  };
}

describe("analyzeDays", () => {
  it("pula semana com assembleia regional", () => {
    const days = analyzeDays(
      baseInput({ specialEvents: [assemblyEvent("regional_assembly", "2026-09-03")] }),
    );
    const meetingDays = days.filter((d) => d.isMidweek || d.isWeekend);
    expect(meetingDays).toHaveLength(2);
    expect(meetingDays.every((d) => d.assemblyType !== null)).toBe(true);
  });

  it("mantém limpeza no memorial (celebrationReplacement)", () => {
    const days = analyzeDays(
      baseInput({ specialEvents: [assemblyEvent("memorial", "2026-09-01")] }),
    );
    const day = days.find((d) => d.date === "2026-09-01");
    expect(day?.celebrationReplacement).toBe(true);
    expect(day?.assemblyType).toBeNull();
  });

  it("pula dia com exceção no_meeting", () => {
    const exception: ScheduleExceptionItem = {
      id: "ex1",
      type: "no_meeting",
      date: "2026-09-01",
      notes: null,
    };
    const days = analyzeDays(baseInput({ scheduleExceptions: [exception] }));
    expect(days.find((d) => d.date === "2026-09-01")?.assemblyType).not.toBeNull();
  });
});

describe("validateWeeklyConstraint", () => {
  it("rejeita dois dias na mesma semana", () => {
    expect(validateWeeklyConstraint(["2026-09-01", "2026-09-03"]).valid).toBe(false);
  });

  it("aceita dias em semanas diferentes", () => {
    expect(validateWeeklyConstraint(["2026-09-01", "2026-09-08"]).valid).toBe(true);
  });
});

describe("generateCleaningAssignments", () => {
  it("não repete a mesma pessoa no meio de semana e no fim de semana (seg-dom)", () => {
    const { assignments, messages } = generateCleaningAssignments(baseInput());
    const day1 = new Set(
      assignments.filter((a) => a.assignmentDate === "2026-09-01").map((a) => a.personId),
    );
    const day2 = new Set(
      assignments.filter((a) => a.assignmentDate === "2026-09-06").map((a) => a.personId),
    );
    expect([...day1].filter((id) => day2.has(id))).toHaveLength(0);
    expect(messages.filter((m) => m.message.includes("repetido"))).toHaveLength(0);
  });

  it("não designa ninguém em dois setores no mesmo dia", () => {
    const { assignments } = generateCleaningAssignments(baseInput());
    const seen = new Set<string>();
    for (const a of assignments) {
      const key = `${a.assignmentDate}:${a.personId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("mantém jovem fora de setor só-adulto quando há adulto", () => {
    const { assignments } = generateCleaningAssignments(
      baseInput({
        persons: [person("a1"), person("a2"), person("j1", { young: true })],
        sectors: [sector("banheiro", { requiredSex: "male", allowYoung: false })],
      }),
    );
    const banheiros = assignments.filter((a) => a.sectorKey === "banheiro");
    expect(banheiros.length).toBeGreaterThan(0);
    expect(banheiros.every((a) => a.personId !== "j1")).toBe(true);
  });

  it("usa jovem como fallback em setor adulto e avisa", () => {
    const { assignments, messages } = generateCleaningAssignments(
      baseInput({
        persons: [person("j1", { young: true })],
        sectors: [sector("banheiro", { allowYoung: false })],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
      }),
    );
    expect(assignments).toHaveLength(1);
    expect(messages.some((m) => m.message.includes("joven"))).toBe(true);
  });

  it("escala família junta no mesmo setor quando cabe", () => {
    const { assignments } = generateCleaningAssignments(
      baseInput({
        persons: [person("h1", { familyHead: true }), person("m1", { familyMemberId: "h1" })],
        sectors: [sector("auditorio", { peopleCount: 2 })],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
      }),
    );
    expect(assignments).toHaveLength(2);
    expect(assignments[0].sectorKey).toBe(assignments[1].sectorKey);
    expect(new Set(assignments.map((a) => a.personId)).size).toBe(2);
  });

  it("não divide família que não cabe (prefere solo e completa depois)", () => {
    const { assignments } = generateCleaningAssignments(
      baseInput({
        persons: [
          person("h1", { familyHead: true }),
          person("m1", { familyMemberId: "h1" }),
          person("a1"),
        ],
        sectors: [sector("banheiro", { peopleCount: 1 })],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
      }),
    );
    expect(assignments).toHaveLength(1);
    expect(assignments[0].personId).toBe("a1");
  });

  it("rotaciona quem tem mais designações no setor (score)", () => {
    const { assignments } = generateCleaningAssignments(
      baseInput({
        persons: [person("a1"), person("a2")],
        sectors: [sector("banheiro")],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
        history: {
          totalByPerson: { a1: 5 },
          sectorByPerson: { a1: { banheiro: 4 } },
          lastDateByPerson: { a1: "2026-08-25" },
          datesByPerson: { a1: ["2026-08-25"] },
        },
      }),
    );
    expect(assignments[0].personId).toBe("a2");
  });

  it("considera designações futuras (drafts) no histórico", () => {
    const { assignments } = generateCleaningAssignments(
      baseInput({
        persons: [person("a1"), person("a2")],
        sectors: [sector("banheiro")],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
        history: {
          totalByPerson: { a1: 3 },
          sectorByPerson: { a1: { banheiro: 2 } },
          lastDateByPerson: { a1: "2026-09-20" },
          datesByPerson: { a1: ["2026-08-25", "2026-09-20"] },
        },
      }),
    );
    expect(assignments[0].personId).toBe("a2");
  });

  it("avisa quando o setor fica incompleto por falta de gente", () => {
    const { assignments, messages } = generateCleaningAssignments(
      baseInput({
        persons: [person("a1")],
        sectors: [sector("auditorio", { peopleCount: 3 })],
        startDate: "2026-09-01",
        endDate: "2026-09-01",
      }),
    );
    expect(assignments).toHaveLength(1);
    expect(messages.some((m) => m.message.includes("1/3"))).toBe(true);
  });

  it("repete pessoa na mesma semana só com aviso quando o pool é pequeno", () => {
    const { assignments, messages } = generateCleaningAssignments(
      baseInput({
        persons: [person("a1"), person("a2")],
        sectors: [sector("banheiro", { peopleCount: 2 })],
      }),
    );
    // Dia 1 usa os 2; dia 2 (mesma semana) precisa repetir com aviso.
    expect(assignments.length).toBeGreaterThan(2);
    expect(messages.some((m) => m.message.includes("repetido"))).toBe(true);
  });
});
