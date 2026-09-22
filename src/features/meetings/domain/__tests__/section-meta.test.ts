import { describe, expect, it } from "vitest";
import { DEFAULT_SECTION_COLOR, sectionMetaOf } from "@/features/meetings/domain/section-meta";

describe("sectionMetaOf", () => {
  it("exibe PUBLIC TALK como Discurso público", () => {
    expect(sectionMetaOf("PUBLIC TALK")).toEqual({ label: "Discurso público", color: "#2f4868" });
  });

  it("mantém as demais seções", () => {
    expect(sectionMetaOf("ESTUDIO DE LA ATALAYA").label).toBe("Estudio de la Atalaya");
    expect(sectionMetaOf("TESOROS DE LA BIBLIA").color).toBe("#3c7f8b");
    expect(sectionMetaOf("SEAMOS MEJORES MAESTROS").color).toBe("#d68f00");
    expect(sectionMetaOf("NUESTRA VIDA CRISTIANA").color).toBe("#bf2f13");
  });

  it("usa cor neutra para seção desconhecida", () => {
    expect(sectionMetaOf("")).toEqual({ label: "", color: DEFAULT_SECTION_COLOR });
  });
});
