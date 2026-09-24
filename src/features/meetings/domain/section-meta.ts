/**
 * Identidade visual das seções do programa (cores oficiais da congregação).
 * Chaves em caixa alta (dados), rótulos em caixa normal (exibição).
 * "PUBLIC TALK" é exibido como "Discurso público".
 */

export interface SectionMeta {
  label: string;
  color: string;
}

export const DEFAULT_SECTION_COLOR = "#63636b";

const SECTION_META: Record<string, SectionMeta> = {
  "TESOROS DE LA BIBLIA": { label: "Tesoros de la Biblia", color: "#3c7f8b" },
  "SEAMOS MEJORES MAESTROS": { label: "Seamos mejores maestros", color: "#d68f00" },
  "NUESTRA VIDA CRISTIANA": { label: "Nuestra vida cristiana", color: "#bf2f13" },
  "PUBLIC TALK": { label: "Discurso público", color: "#2f4868" },
  "ESTUDIO DE LA ATALAYA": { label: "Estudio de la Atalaya", color: "#4d654d" },
};

export function sectionMetaOf(section: string): SectionMeta {
  return SECTION_META[section] ?? { label: section, color: DEFAULT_SECTION_COLOR };
}
