/**
 * Identidade visual das seções do programa (cores oficiais da congregação).
 * "PUBLIC TALK" é exibido como "DISCURSO PÚBLICO".
 */

export interface SectionMeta {
  label: string;
  color: string;
}

export const DEFAULT_SECTION_COLOR = "#3f3f46";

const SECTION_META: Record<string, SectionMeta> = {
  "TESOROS DE LA BIBLIA": { label: "TESOROS DE LA BIBLIA", color: "#3c7f8b" },
  "SEAMOS MEJORES MAESTROS": { label: "SEAMOS MEJORES MAESTROS", color: "#d68f00" },
  "NUESTRA VIDA CRISTIANA": { label: "NUESTRA VIDA CRISTIANA", color: "#bf2f13" },
  "PUBLIC TALK": { label: "DISCURSO PÚBLICO", color: "#2f4868" },
  "ESTUDIO DE LA ATALAYA": { label: "ESTUDIO DE LA ATALAYA", color: "#4d654d" },
};

export function sectionMetaOf(section: string): SectionMeta {
  return SECTION_META[section] ?? { label: section, color: DEFAULT_SECTION_COLOR };
}
