import { describe, expect, it } from "vitest";
import {
  canonicalOutline,
  matchPublicTalk,
  type OutlineLike,
  type SpeakerLike,
} from "@/features/meetings/domain/public-talk-search";

const outlines: OutlineLike[] = [
  { id: "es-12", number: 12, theme: "Tema canónico doce", language: "es" },
  { id: "pt-12", number: 12, theme: "Tema português doze", language: "pt" },
  { id: "es-45", number: 45, theme: "El reino de Dios", language: "es" },
];

const speakers: SpeakerLike[] = [
  {
    id: "a",
    name: "García López",
    congregation: "Norte",
    talks: [{ talkNumber: 12, talkTheme: "Tema antigo" }],
  },
  {
    id: "b",
    name: "Pérez Gil",
    congregation: "Norte",
    talks: [
      { talkNumber: 12, talkTheme: "Tema canónico doce" },
      { talkNumber: 45, talkTheme: "El reino" },
    ],
  },
  {
    id: "c",
    name: "Silva Rosa",
    congregation: "Sur",
    talks: [{ talkNumber: 99, talkTheme: "Fora da biblioteca" }],
  },
  { id: "d", name: "Sem Esboço", congregation: "Sur", talks: [] },
];

describe("public-talk-search", () => {
  it("prefere o tema canônico em espanhol", () => {
    expect(canonicalOutline(outlines, 12)).toEqual({
      number: 12,
      theme: "Tema canónico doce",
      outlineId: "es-12",
    });
    expect(canonicalOutline(outlines, 77)).toBeNull();
  });

  it("número casa esboço + oradores que o têm", () => {
    const result = matchPublicTalk(speakers, outlines, "12");
    expect(result.outlines).toHaveLength(1);
    expect(result.outlines[0]?.theme).toBe("Tema canónico doce");
    expect(result.speakers.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.speakers[0]?.talks).toHaveLength(1);
  });

  it("nome preenche congregação e esboços do orador", () => {
    const result = matchPublicTalk(speakers, outlines, "pérez");
    expect(result.speakers).toHaveLength(1);
    expect(result.speakers[0]?.congregation).toBe("Norte");
    expect(result.speakers[0]?.talks.map((t) => t.number)).toEqual([12, 45]);
  });

  it("congregação traz todos os oradores dela", () => {
    const result = matchPublicTalk(speakers, outlines, "norte");
    expect(result.speakers.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("tema casa oradores que o têm (biblioteca ou ficha)", () => {
    const result = matchPublicTalk(speakers, outlines, "reino");
    expect(result.speakers.map((s) => s.id)).toEqual(["b"]);
    expect(result.speakers[0]?.talks.map((t) => t.number)).toEqual([45]);
  });

  it("exclui orador sem esboço da biblioteca e sem esboço", () => {
    const result = matchPublicTalk(speakers, outlines, "silva");
    expect(result.speakers).toHaveLength(0);
    const empty = matchPublicTalk(speakers, outlines, "sem esboço");
    expect(empty.speakers).toHaveLength(0);
  });

  it("ignora busca curta", () => {
    expect(matchPublicTalk(speakers, outlines, "a")).toEqual({ outlines: [], speakers: [] });
  });
});
