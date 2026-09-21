import { describe, expect, it } from "vitest";
import { DEFAULT_SECTION_COLOR, sectionMetaOf } from "@/features/meetings/domain/section-meta";

describe("sectionMetaOf", () => {
  it("exibe PUBLIC TALK como DISCURSO PÚBLICO", () => {
    expect(sectionMetaOf("PUBLIC TALK")).toEqual({ label: "DISCURSO PÚBLICO", color: "#2f4868" });
  });

  it("mantém as demais seções", () => {
    expect(sectionMetaOf("ESTUDIO DE LA ATALAYA").label).toBe("ESTUDIO DE LA ATALAYA");
    expect(sectionMetaOf("TESOROS DE LA BIBLIA").color).toBe("#656164");
  });

  it("usa cor neutra para seção desconhecida", () => {
    expect(sectionMetaOf("")).toEqual({ label: "", color: DEFAULT_SECTION_COLOR });
  });
});
