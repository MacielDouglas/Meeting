/**
 * Busca inteligente do discurso público: um único campo casa número do
 * esboço, nome do orador, congregação ou tema — contra a ficha do orador e a
 * biblioteca canônica. Tema canônico sempre vence o salvo na ficha.
 */

export interface SpeakerTalkLike {
  talkNumber: number;
  talkTheme: string;
}

export interface SpeakerLike {
  id: string;
  name: string;
  congregation: string;
  talks: SpeakerTalkLike[];
}

export interface OutlineLike {
  id: string;
  number: number;
  theme: string;
  language: string;
}

export interface CanonicalTalk {
  number: number;
  theme: string;
  outlineId: string;
}

export interface SpeakerHit {
  id: string;
  name: string;
  congregation: string;
  talks: CanonicalTalk[];
}

export interface PublicTalkSearchResult {
  /** Esboços da biblioteca que casaram (número ou tema). */
  outlines: CanonicalTalk[];
  /** Oradores elegíveis (≥1 esboço da biblioteca) com seus esboços. */
  speakers: SpeakerHit[];
}

const LANGUAGE_PRIORITY = ["es", "pt", "en"];

/** Esboço canônico por número: es > pt > en > primeiro. */
export function canonicalOutline(outlines: OutlineLike[], number: number): CanonicalTalk | null {
  const candidates = outlines.filter((o) => o.number === number);
  if (candidates.length === 0) return null;
  const ordered = [...candidates].sort(
    (a, b) => LANGUAGE_PRIORITY.indexOf(a.language) - LANGUAGE_PRIORITY.indexOf(b.language),
  );
  const winner = ordered[0] ?? candidates[0];
  if (!winner) return null;
  return { number: winner.number, theme: winner.theme, outlineId: winner.id };
}

/** Esboços da biblioteca do orador (só números que existem na biblioteca). */
function libraryTalksOf(speaker: SpeakerLike, outlines: OutlineLike[]): CanonicalTalk[] {
  const seen = new Set<number>();
  const talks: CanonicalTalk[] = [];
  for (const talk of speaker.talks) {
    if (seen.has(talk.talkNumber)) continue;
    const canonical = canonicalOutline(outlines, talk.talkNumber);
    if (!canonical) continue;
    seen.add(talk.talkNumber);
    talks.push(canonical);
  }
  return talks.sort((a, b) => a.number - b.number);
}

function uniqueOutlines(outlines: OutlineLike[], numbers: number[]): CanonicalTalk[] {
  const result: CanonicalTalk[] = [];
  for (const number of [...new Set(numbers)].sort((a, b) => a - b)) {
    const canonical = canonicalOutline(outlines, number);
    if (canonical) result.push(canonical);
  }
  return result;
}

/**
 * Filtro inteligente: número casa esboço + oradores que o têm; texto casa
 * nome, congregação ou tema (biblioteca ou ficha). Orador sem esboço da
 * biblioteca nunca aparece — designar exige ficha + esboço.
 */
export function matchPublicTalk(
  speakers: SpeakerLike[],
  outlines: OutlineLike[],
  rawQuery: string,
): PublicTalkSearchResult {
  const empty: PublicTalkSearchResult = { outlines: [], speakers: [] };
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return empty;

  if (/^\d+$/.test(query)) {
    const number = Number(query);
    const outline = canonicalOutline(outlines, number);
    if (!outline) return empty;
    const hits: SpeakerHit[] = [];
    for (const speaker of speakers) {
      if (!speaker.talks.some((talk) => talk.talkNumber === number)) continue;
      hits.push({
        id: speaker.id,
        name: speaker.name,
        congregation: speaker.congregation,
        talks: [outline],
      });
    }
    hits.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    return { outlines: [outline], speakers: hits };
  }

  const outlineHits = uniqueOutlines(
    outlines,
    outlines
      .filter((o) => o.theme.toLowerCase().includes(query) || String(o.number).includes(query))
      .map((o) => o.number),
  );
  const hitNumbers = new Set(outlineHits.map((o) => o.number));

  const hits: SpeakerHit[] = [];
  for (const speaker of speakers) {
    const nameHit = speaker.name.toLowerCase().includes(query);
    const congregationHit = speaker.congregation.toLowerCase().includes(query);
    const libraryTalks = libraryTalksOf(speaker, outlines);
    if (libraryTalks.length === 0) continue;
    if (nameHit || congregationHit) {
      hits.push({
        id: speaker.id,
        name: speaker.name,
        congregation: speaker.congregation,
        talks: libraryTalks,
      });
      continue;
    }
    const themeTalks = libraryTalks.filter((talk) => {
      const saved = speaker.talks.find((t) => t.talkNumber === talk.number)?.talkTheme ?? "";
      return (
        talk.theme.toLowerCase().includes(query) ||
        saved.toLowerCase().includes(query) ||
        String(talk.number).includes(query)
      );
    });
    const numberTalks =
      themeTalks.length > 0 ? themeTalks : libraryTalks.filter((t) => hitNumbers.has(t.number));
    if (numberTalks.length > 0 || themeTalks.length > 0) {
      hits.push({
        id: speaker.id,
        name: speaker.name,
        congregation: speaker.congregation,
        talks: themeTalks.length > 0 ? themeTalks : numberTalks,
      });
    }
  }
  hits.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  return { outlines: outlineHits, speakers: hits };
}
