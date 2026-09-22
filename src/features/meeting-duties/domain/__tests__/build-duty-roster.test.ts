import { describe, expect, it } from "vitest";
import {
  buildDutyRoster,
  buildDutySeats,
  type DutyPerson,
  type DutySectorConfig,
} from "@/features/meeting-duties/domain/build-duty-roster";

function person(
  id: string,
  name: string,
  flags: Partial<Record<string, boolean>> = {},
): DutyPerson {
  return {
    id,
    name,
    sex: "male",
    flags: {
      usher: false,
      sound: false,
      video: false,
      microphone: false,
      platform: false,
      ...flags,
    },
  };
}

const sectors: DutySectorConfig[] = [
  { key: "usher", name: "Acomodadores", enabled: true, peopleCount: 2, slots: ["A", "B"] },
  { key: "sound", name: "Som", enabled: true, peopleCount: 1, slots: [] },
  { key: "video", name: "Vídeo", enabled: false, peopleCount: 1, slots: [] },
];

describe("build-duty-roster", () => {
  it("monta postos com lados alternados no acomodador", () => {
    const seats = buildDutySeats(sectors);
    expect(seats.map((s) => [s.dutyKey, s.postLabel, s.side])).toEqual([
      ["usher", "A", "interno"],
      ["usher", "B", "externo"],
      ["sound", "Som", null],
    ]);
  });

  it("ignora setores desativados e com zero vagas", () => {
    const seats = buildDutySeats([
      ...sectors,
      { key: "platform", name: "Plataforma", enabled: true, peopleCount: 0, slots: [] },
    ]);
    expect(seats.some((s) => s.dutyKey === "video")).toBe(false);
    expect(seats.some((s) => s.dutyKey === "platform")).toBe(false);
  });

  it("alternativa elegíveis por rodízio (menos escalados primeiro)", () => {
    const team = [person("1", "Ana", { usher: true }), person("2", "Bia", { usher: true })];
    const [first, second] = buildDutyRoster(
      [
        { date: "2026-09-24", kind: "midweek" },
        { date: "2026-09-27", kind: "weekend" },
      ],
      [{ key: "usher", name: "Acomodadores", enabled: true, peopleCount: 1, slots: ["A"] }],
      team,
      [{ personId: "1", date: "2026-09-01" }],
      new Map(),
    );
    expect(first?.slots[0]?.personId).toBe("2");
    expect(second?.slots[0]?.personId).toBe("1");
  });

  it("exige flag do posto e sexo masculino", () => {
    const team = [
      { ...person("1", "Ana", { sound: true }), sex: "female" as const },
      person("2", "Bia", { sound: true }),
      person("3", "Cia", { video: true }),
    ];
    const [draft] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      [{ key: "sound", name: "Som", enabled: true, peopleCount: 1, slots: [] }],
      team,
      [],
      new Map(),
    );
    expect(draft?.slots[0]?.personId).toBe("2");
  });

  it("exclui quem serve no programa na data", () => {
    const team = [person("1", "Ana", { sound: true }), person("2", "Bia", { sound: true })];
    const [draft] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      [{ key: "sound", name: "Som", enabled: true, peopleCount: 1, slots: [] }],
      team,
      [],
      new Map([["2026-09-24", new Set(["1"])]]),
    );
    expect(draft?.slots[0]?.personId).toBe("2");
  });

  it("deixa vaga quando ninguém é elegível", () => {
    const [draft] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      [{ key: "platform", name: "Plataforma", enabled: true, peopleCount: 1, slots: [] }],
      [person("1", "Ana", { sound: true })],
      [],
      new Map(),
    );
    expect(draft?.slots[0]?.personId).toBeNull();
  });
});
