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

  it("numera postos repetidos para chaves únicas", () => {
    const seats = buildDutySeats([
      { key: "microphone", name: "Microfone", enabled: true, peopleCount: 2, slots: [] },
    ]);
    expect(seats.map((s) => s.postLabel)).toEqual(["Microfone", "Microfone 2"]);
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

  it("presidente sai de tudo; estudo sai só do microfone", () => {
    const team = [
      person("1", "Ana", { sound: true, microphone: true }),
      person("2", "Bia", { sound: true, microphone: true }),
    ];
    const sectorsAll: DutySectorConfig[] = [
      { key: "sound", name: "Som", enabled: true, peopleCount: 1, slots: [] },
      { key: "microphone", name: "Microfone", enabled: true, peopleCount: 1, slots: [] },
    ];
    const [draft] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      sectorsAll,
      team,
      [],
      new Map([["2026-09-24", new Set(["1"])]]),
      new Map(),
    );
    expect(draft?.slots.map((s) => s.personId)).toEqual(["2", "2"]);

    const [draft2] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      sectorsAll,
      team,
      [{ personId: "2", date: "2026-09-01" }],
      new Map(),
      new Map([["2026-09-24", new Set(["1"])]]),
    );
    const byKey = new Map(draft2?.slots.map((s) => [s.dutyKey, s.personId]));
    expect(byKey.get("sound")).toBe("1");
    expect(byKey.get("microphone")).toBe("2");
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

  it("espalha postos do mesmo dia entre elegíveis", () => {
    const team = [
      person("1", "Ana", { usher: true }),
      person("2", "Bia", { usher: true }),
      person("3", "Cia", { usher: true }),
    ];
    const [draft] = buildDutyRoster(
      [{ date: "2026-09-24", kind: "midweek" }],
      [{ key: "usher", name: "Acomodadores", enabled: true, peopleCount: 2, slots: ["A", "B"] }],
      team,
      [],
      new Map(),
    );
    const picked = (draft?.slots ?? []).map((s) => s.personId);
    expect(new Set(picked).size).toBe(2);
  });

  it("varia o sorteio em empates (sem histórico idêntico a cada geração)", () => {
    const team = [
      person("1", "Ana", { sound: true }),
      person("2", "Bia", { sound: true }),
      person("3", "Cia", { sound: true }),
    ];
    const sectorsAll: DutySectorConfig[] = [
      { key: "sound", name: "Som", enabled: true, peopleCount: 1, slots: [] },
    ];
    const winners = new Set<string | null>();
    for (let i = 0; i < 20; i += 1) {
      const [draft] = buildDutyRoster(
        [{ date: "2026-09-24", kind: "midweek" }],
        [...sectorsAll],
        team,
        [],
        new Map(),
      );
      winners.add(draft?.slots[0]?.personId ?? null);
    }
    expect(winners.size).toBeGreaterThan(1);
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
