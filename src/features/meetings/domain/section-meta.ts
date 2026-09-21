/**
 * Identidade visual das seções do programa (cores do TheocBase).
 * "PUBLIC TALK" é exibido como "DISCURSO PÚBLICO".
 */

export interface SectionMeta {
  label: string;
  color: string;
}

export const DEFAULT_SECTION_COLOR = "#3f3f46";

const SECTION_META: Record<string, SectionMeta> = {
  "TESOROS DE LA BIBLIA": { label: "TESOROS DE LA BIBLIA", color: "#656164" },
  "SEAMOS MEJORES MAESTROS": { label: "SEAMOS MEJORES MAESTROS", color: "#c78909" },
  "NUESTRA VIDA CRISTIANA": { label: "NUESTRA VIDA CRISTIANA", color: "#99131e" },
  "PUBLIC TALK": { label: "DISCURSO PÚBLICO", color: "#2f4868" },
  "ESTUDIO DE LA ATALAYA": { label: "ESTUDIO DE LA ATALAYA", color: "#4d654d" },
};

export function sectionMetaOf(section: string): SectionMeta {
  return SECTION_META[section] ?? { label: section, color: DEFAULT_SECTION_COLOR };
}
