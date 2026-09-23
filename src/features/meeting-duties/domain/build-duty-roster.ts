/**
 * Escala de apoio da reunião ("En la reunión"): 5 postos fixos por data de
 * reunião (acomodador, som, vídeo, microfone volante, plataforma), sorteio
 * com rodízio justo (menos escalados e há mais tempo primeiro) e edição
 * manual posterior. Quem serve no programa é excluído do sorteio da data.
 */

export type DutyKey = "usher" | "sound" | "video" | "microphone" | "platform";

export type DutySide = "interno" | "externo";

export interface DutyPerson {
  id: string;
  name: string;
  sex: "male" | "female";
  flags: Record<DutyKey, boolean>;
}

export interface DutySectorConfig {
  key: DutyKey;
  name: string;
  enabled: boolean;
  /** Vagas por data; null usa o nº de postos. */
  peopleCount: number | null;
  /** Rótulos dos postos (ex.: setores do auditório, microfones). */
  slots: string[];
}

export interface DutyDate {
  date: string;
  kind: "midweek" | "weekend";
}

export interface DutyHistoryEntry {
  personId: string;
  date: string;
}

export interface DutySlotDraft {
  dutyKey: DutyKey;
  dutyName: string;
  postLabel: string;
  side: DutySide | null;
  personId: string | null;
}

export interface DutyDateDraft {
  date: string;
  kind: DutyDate["kind"];
  slots: DutySlotDraft[];
}

interface SeatSpec {
  dutyKey: DutyKey;
  dutyName: string;
  postLabel: string;
  side: DutySide | null;
}

/** Postos de uma data a partir da config (lados alternados só no acomodador). */
export function buildDutySeats(sectors: DutySectorConfig[]): SeatSpec[] {
  const seats: SeatSpec[] = [];
  for (const sector of sectors) {
    if (!sector.enabled) continue;
    const posts = sector.slots.length > 0 ? sector.slots : [sector.name];
    const totalSeats = sector.peopleCount ?? posts.length;
    if (totalSeats <= 0) continue;
    // Rótulos únicos por data: repetição ganha sufixo ("Microfone", "Microfone 2").
    const postUsage = new Map<string, number>();
    for (let seat = 0; seat < totalSeats; seat += 1) {
      const post = posts[seat % posts.length] ?? sector.name;
      const used = postUsage.get(post) ?? 0;
      postUsage.set(post, used + 1);
      seats.push({
        dutyKey: sector.key,
        dutyName: sector.name,
        postLabel: used === 0 ? post : `${post} ${used + 1}`,
        side: sector.key === "usher" ? (seat % 2 === 0 ? "interno" : "externo") : null,
      });
    }
  }
  return seats;
}

interface FairnessState {
  totals: Map<string, number>;
  lastDate: Map<string, string>;
}

function scoreOf(person: DutyPerson, state: FairnessState): [number, string] {
  return [state.totals.get(person.id) ?? 0, state.lastDate.get(person.id) ?? ""];
}

function compareScore(a: [number, string], b: [number, string]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
  return 0;
}

/**
 * Totais, depois data mais antiga; empate desempatado por sorteio (ordem
 * alfabética pura gerava a mesma escala a cada geração sem histórico).
 */
function pickFair(candidates: DutyPerson[], state: FairnessState): DutyPerson | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  if (!best) return null;
  let tied: DutyPerson[] = [best];
  for (const candidate of candidates.slice(1)) {
    const diff = compareScore(scoreOf(candidate, state), scoreOf(best, state));
    if (diff < 0) {
      best = candidate;
      tied = [candidate];
    } else if (diff === 0) {
      tied.push(candidate);
    }
  }
  return tied[Math.floor(Math.random() * tied.length)] ?? null;
}

/**
 * Monta o rascunho da escala. `excludedByDate` traz quem sai de tudo na data
 * (presidente); `micExcludedByDate` traz quem sai só do microfone volante
 * (dirigente + leitor do estudo). Fora do sorteio, liberado na edição manual.
 */
export function buildDutyRoster(
  dates: DutyDate[],
  sectors: DutySectorConfig[],
  persons: DutyPerson[],
  history: DutyHistoryEntry[],
  excludedByDate: Map<string, Set<string>>,
  micExcludedByDate: Map<string, Set<string>> = new Map(),
): DutyDateDraft[] {
  const state: FairnessState = { totals: new Map(), lastDate: new Map() };
  for (const entry of history) {
    state.totals.set(entry.personId, (state.totals.get(entry.personId) ?? 0) + 1);
    const previous = state.lastDate.get(entry.personId) ?? "";
    if (entry.date > previous) state.lastDate.set(entry.personId, entry.date);
  }

  return dates.map(({ date, kind }) => {
    const seats = buildDutySeats(sectors);
    const excluded = excludedByDate.get(date) ?? new Set<string>();
    const micExcluded = micExcludedByDate.get(date) ?? new Set<string>();
    // Acumular no dia só sem alternativa: evita a mesma pessoa em 2 postos.
    const usedToday = new Set<string>();
    const slots: DutySlotDraft[] = seats.map((seat) => {
      const eligible = persons.filter(
        (person) =>
          person.sex === "male" &&
          person.flags[seat.dutyKey] === true &&
          !excluded.has(person.id) &&
          !(seat.dutyKey === "microphone" && micExcluded.has(person.id)),
      );
      const fresh = eligible.filter((person) => !usedToday.has(person.id));
      const candidates = fresh.length > 0 ? fresh : eligible;
      const picked = pickFair(candidates, state);
      if (picked) {
        state.totals.set(picked.id, (state.totals.get(picked.id) ?? 0) + 1);
        state.lastDate.set(picked.id, date);
        usedToday.add(picked.id);
      }
      return {
        dutyKey: seat.dutyKey,
        dutyName: seat.dutyName,
        postLabel: seat.postLabel,
        side: seat.side,
        personId: picked?.id ?? null,
      };
    });
    return { date, kind, slots };
  });
}
