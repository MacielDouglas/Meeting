/**
 * Construtor do programa de reuniões (entre semana e fim de semana).
 *
 * Entre semana (1h45 = 105min), relógio corrido a partir do horário inicial:
 * - Presidente: 0 (só designação, com filtro midweek_chairman)
 * - Cântico inicial: 5 (sem designação de pessoa)
 * - Palavras de introdução: 1 (sem designação de pessoa)
 * - TESOUROS (25): discurso 10 + pérolas 10 + leitura 4 + 1 do presidente (somado, sem linha)
 * - SEAMOS (15): cada parte soma duração + 1 do presidente (somado, sem linha)
 * - VIDA (45): cântico do meio 5 + partes variadas + estudo 30 + conclusão 3 + cântico final 5
 *
 * Fim de semana (105min):
 * - Cântico inicial + oração: 5 (usuário escolhe pelo número)
 * - Discurso público: 30 (usuário escolhe esboço + orador)
 * - Cântico da Atalaya (inicial do estudo): 5
 * - Tema da Atalaya: 60 (dirigente + leitor)
 * - Cântico final + oração: 5 (final da Sentinela)
 */

export interface ProgramPartInput {
  key: string;
  section: string;
  title: string;
  subtitle?: string;
  durationMinutes: number;
  songNumber?: number | null;
  songTheme?: string | null;
  needsHelper?: boolean;
  capability?: string;
}

export interface BuiltPart extends ProgramPartInput {
  startTime: string;
}

export function parseDurationMinutes(label: string | undefined, fallback: number): number {
  if (!label) return fallback;
  const match = label.match(/(\d+)\s*mins?\.?/i);
  return match ? Number(match[1]) : fallback;
}

export function extractSongNumber(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = String(text).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Normaliza texto da apostila para classificar a parte (minúsculas, sem
 * acentos nem pontuação): "Haga discípulos" e "¿Qué dirías?" viram
 * "haga discipulos" e "que dirias".
 */
export function normalizeMinistryText(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,:;()"«»—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ClassifiedMinistry {
  capability: string;
  needsHelper: boolean;
}

/**
 * Classifica a parte de "Seamos mejores maestros" pelo título da apostila:
 * - Empiece conversaciones: titular + ajudante (mesmo sexo ou família)
 * - Haga revisitas / Haga discípulos: titular + ajudante (mesmo sexo)
 * - Qué dirías: sem ajudante, ancião ou servo ministerial
 * - Explique sus creencias (Escenificación): titular + ajudante (mesmo sexo ou família)
 * - Explique sus creencias (discurso) / Discurso: sem ajudante, better_speech
 */
export function classifyMinistryPart(input: {
  title: string;
  assignment?: string;
  territory?: string;
}): ClassifiedMinistry {
  const title = normalizeMinistryText(input.title);
  const context = normalizeMinistryText(
    `${input.territory ?? ""} ${input.assignment ?? ""} ${input.title}`,
  );
  if (title.includes("explique sus creencias") || context.includes("explique sus creencias")) {
    if (context.includes("escenific")) {
      return { capability: "ministryExplainStaging", needsHelper: true };
    }
    return { capability: "ministrySpeech", needsHelper: false };
  }
  if (title.includes("que dirias")) {
    return { capability: "ministryElder", needsHelper: false };
  }
  if (title.includes("empiece conversaciones")) {
    return { capability: "ministryStart", needsHelper: true };
  }
  if (title.includes("haga revisitas")) {
    return { capability: "ministryReturn", needsHelper: true };
  }
  if (title.includes("haga discipulos")) {
    return { capability: "ministryDisciples", needsHelper: true };
  }
  if (title === "discurso" || title.startsWith("discurso ")) {
    return { capability: "ministrySpeech", needsHelper: false };
  }
  return { capability: "ministry", needsHelper: true };
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export interface WorkbookWeekLike {
  meeting: {
    song?: { openingSong?: string; middleSong?: string; closingSong?: string }[];
    openingComments?: string;
    concludingComments?: string;
    BibleReading?: string;
    "TREASURES FROM GODS WORD"?: { title: string; duration?: string; assignment?: string }[];
    "APPLY YOURSELF TO THE FIELD MINISTRY"?: {
      title: string;
      duration?: string;
      assignment?: string;
      territory?: string;
    }[];
    "LIVING AS CHRISTIANS"?: { title: string; duration?: string; assignment?: string }[];
  };
}

export function buildMidweekParts(
  week: WorkbookWeekLike,
  startTime: string,
  songThemeByNumber: Map<number, string>,
): BuiltPart[] {
  const parts: ProgramPartInput[] = [];
  const song = week.meeting.song?.[0];
  const themeOf = (label: string | undefined): string | null => {
    const n = extractSongNumber(label);
    return n != null ? (songThemeByNumber.get(n) ?? null) : null;
  };

  const openingNum = extractSongNumber(song?.openingSong);
  const middleNum = extractSongNumber(song?.middleSong);
  const closingNum = extractSongNumber(song?.closingSong);

  // Presidente antes do cântico: única designação com filtro midweek_chairman
  // no cabeçalho. Duração zero: não consome o relógio.
  parts.push({
    key: "president",
    section: "",
    title: "Presidente",
    durationMinutes: 0,
    capability: "president",
  });
  parts.push({
    key: "opening-song",
    section: "",
    title: song?.openingSong ? `${song.openingSong}` : "Canción",
    subtitle: openingNum != null ? (songThemeByNumber.get(openingNum) ?? "") : "",
    durationMinutes: 5,
    songNumber: openingNum,
    songTheme: openingNum != null ? (songThemeByNumber.get(openingNum) ?? null) : null,
  });
  void themeOf;
  parts.push({
    key: "opening-comments",
    section: "",
    title: "Palabras de introducción",
    durationMinutes: 1,
  });

  const treasures = week.meeting["TREASURES FROM GODS WORD"] ?? [];
  const talk = treasures[0];
  const gems = treasures[1];
  const reading = treasures[2];
  if (talk) {
    parts.push({
      key: "treasures-talk",
      section: "TESOROS DE LA BIBLIA",
      title: talk.title,
      subtitle: week.meeting.BibleReading ?? "",
      durationMinutes: parseDurationMinutes(talk.duration, 10),
      capability: "treasuresTalk",
    });
  }
  if (gems) {
    parts.push({
      key: "treasures-gems",
      section: "TESOROS DE LA BIBLIA",
      title: gems.title || "Busquemos perlas escondidas",
      durationMinutes: parseDurationMinutes(gems.duration, 10),
      capability: "pearlsQuest",
    });
  }
  if (reading) {
    parts.push({
      key: "treasures-reading",
      section: "TESOROS DE LA BIBLIA",
      title: reading.title || "Lectura de la Biblia",
      subtitle: reading.assignment ?? week.meeting.BibleReading ?? "",
      durationMinutes: parseDurationMinutes(reading.duration, 4),
      capability: "bibleReading",
    });
  }
  // +1 do presidente após a leitura (somado ao relógio, sem linha própria).
  const PRESIDENT_EXTRA_TREASURES = 1;

  const ministry = week.meeting["APPLY YOURSELF TO THE FIELD MINISTRY"] ?? [];
  ministry.forEach((part, index) => {
    const duration = parseDurationMinutes(part.duration, 4);
    const classified = classifyMinistryPart({
      title: part.title,
      assignment: part.assignment,
      territory: part.territory,
    });
    parts.push({
      key: `ministry-${index}`,
      section: index === 0 ? "SEAMOS MEJORES MAESTROS" : "SEAMOS MEJORES MAESTROS",
      title: part.title,
      subtitle: part.assignment ?? part.territory ?? "",
      durationMinutes: duration,
      needsHelper: classified.needsHelper,
      capability: classified.capability,
    });
  });
  const PRESIDENT_EXTRA_PER_MINISTRY_PART = 1;

  const living = week.meeting["LIVING AS CHRISTIANS"] ?? [];
  const cbsIndex = living.findIndex((p) => /estudio bíblico de la congregación/i.test(p.title));
  const livingBeforeCbs = cbsIndex >= 0 ? living.slice(0, cbsIndex) : living;
  const cbs = cbsIndex >= 0 ? living[cbsIndex] : null;
  const livingAfterCbs = cbsIndex >= 0 ? living.slice(cbsIndex + 1) : [];

  // Cântico do meio: sem designação de pessoa (só o número/tema).
  parts.push({
    key: "middle-song",
    section: "NUESTRA VIDA CRISTIANA",
    title: song?.middleSong ? `${song.middleSong}` : "Canción",
    subtitle: middleNum != null ? (songThemeByNumber.get(middleNum) ?? "") : "",
    durationMinutes: 5,
    songNumber: middleNum,
    songTheme: middleNum != null ? (songThemeByNumber.get(middleNum) ?? null) : null,
  });

  livingBeforeCbs.forEach((part, index) => {
    parts.push({
      key: `living-${index}`,
      section: "NUESTRA VIDA CRISTIANA",
      title: part.title,
      subtitle: part.assignment ?? "",
      durationMinutes: parseDurationMinutes(part.duration, 10),
      capability: "living",
    });
  });

  if (cbs) {
    parts.push({
      key: "congregation-study",
      section: "NUESTRA VIDA CRISTIANA",
      title: cbs.title || "Estudio bíblico de la congregación",
      subtitle: cbs.assignment ?? "",
      durationMinutes: parseDurationMinutes(cbs.duration, 30),
      needsHelper: true,
      capability: "congregationStudy",
    });
  }
  livingAfterCbs.forEach((part, index) => {
    parts.push({
      key: `living-after-${index}`,
      section: "NUESTRA VIDA CRISTIANA",
      title: part.title,
      subtitle: part.assignment ?? "",
      durationMinutes: parseDurationMinutes(part.duration, 10),
      capability: "living",
    });
  });

  // Palavras de conclusão: sem designação de pessoa.
  parts.push({
    key: "concluding-comments",
    section: "NUESTRA VIDA CRISTIANA",
    title: "Palabras de conclusión",
    durationMinutes: 3,
  });
  // Último cântico: único com designação de pessoa (filtro prayer).
  parts.push({
    key: "closing-song",
    section: "NUESTRA VIDA CRISTIANA",
    title: song?.closingSong ? `${song.closingSong} y oración` : "Canción y oración",
    subtitle: closingNum != null ? (songThemeByNumber.get(closingNum) ?? "") : "",
    durationMinutes: 5,
    songNumber: closingNum,
    songTheme: closingNum != null ? (songThemeByNumber.get(closingNum) ?? null) : null,
    capability: "prayer",
  });

  // Monta o relógio somando o +1 do presidente onde aplicável.
  const built: BuiltPart[] = [];
  let clock = startTime;
  let ministrySeen = 0;
  for (const part of parts) {
    built.push({ ...part, startTime: clock });
    let step = part.durationMinutes;
    if (part.key === "treasures-reading") step += PRESIDENT_EXTRA_TREASURES;
    if (part.key.startsWith("ministry-")) {
      step += PRESIDENT_EXTRA_PER_MINISTRY_PART;
      ministrySeen++;
    }
    void ministrySeen;
    clock = addMinutes(clock, step);
  }
  return built;
}

export interface WatchtowerArticleLike {
  title: string;
  openingSong: number | null;
  closingSong: number | null;
}

export function buildWeekendParts(
  startTime: string,
  openingSongNumber: number | null,
  outlineTheme: string,
  outlineNumber: number | null,
  article: WatchtowerArticleLike | null,
  songThemeByNumber: Map<number, string>,
): BuiltPart[] {
  const parts: ProgramPartInput[] = [];
  // Presidente antes do cântico: pessoa com public_chairman. Duração zero.
  parts.push({
    key: "president",
    section: "",
    title: "Presidente",
    durationMinutes: 0,
    capability: "weekendPresident",
  });
  parts.push({
    key: "opening-song",
    section: "",
    title: "Canción y oración",
    subtitle: openingSongNumber != null ? (songThemeByNumber.get(openingSongNumber) ?? "") : "",
    durationMinutes: 5,
    songNumber: openingSongNumber,
    songTheme:
      openingSongNumber != null ? (songThemeByNumber.get(openingSongNumber) ?? null) : null,
    capability: "weekendOpening",
  });
  parts.push({
    key: "public-talk",
    section: "PUBLIC TALK",
    title:
      outlineNumber != null
        ? `${outlineTheme} (${outlineNumber})`
        : outlineTheme || "Discurso público",
    durationMinutes: 30,
    capability: "publicTalk",
  });
  const atalayaOpening = article?.openingSong ?? null;
  const atalayaClosing = article?.closingSong ?? null;
  parts.push({
    key: "watchtower-song",
    section: "ESTUDIO DE LA ATALAYA",
    title: atalayaOpening != null ? `Canción ${atalayaOpening}` : "Canción",
    subtitle: atalayaOpening != null ? (songThemeByNumber.get(atalayaOpening) ?? "") : "",
    durationMinutes: 5,
    songNumber: atalayaOpening,
    songTheme: atalayaOpening != null ? (songThemeByNumber.get(atalayaOpening) ?? null) : null,
    capability: "prayer",
  });
  parts.push({
    key: "watchtower-study",
    section: "ESTUDIO DE LA ATALAYA",
    title: article?.title ?? "Estudio de La Atalaya",
    durationMinutes: 60,
    needsHelper: true,
    capability: "watchtowerStudy",
  });
  parts.push({
    key: "closing-song",
    section: "ESTUDIO DE LA ATALAYA",
    title: atalayaClosing != null ? `Canción ${atalayaClosing} y oración` : "Canción y oración",
    subtitle: atalayaClosing != null ? (songThemeByNumber.get(atalayaClosing) ?? "") : "",
    durationMinutes: 5,
    songNumber: atalayaClosing,
    songTheme: atalayaClosing != null ? (songThemeByNumber.get(atalayaClosing) ?? null) : null,
    capability: "prayer",
  });

  const built: BuiltPart[] = [];
  let clock = startTime;
  for (const part of parts) {
    built.push({ ...part, startTime: clock });
    clock = addMinutes(clock, part.durationMinutes);
  }
  return built;
}

export function totalMinutes(parts: { durationMinutes: number }[]): number {
  return parts.reduce((acc, p) => acc + p.durationMinutes, 0);
}
