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
    for (let seat = 0; seat < totalSeats; seat += 1) {
      const post = posts[seat % posts.length] ?? sector.name;
      seats.push({
        dutyKey: sector.key,
        dutyName: sector.name,
        postLabel: post,
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

function pickFair(candidates: DutyPerson[], state: FairnessState): DutyPerson | null {
  if (candidates.length === 0) return null;
  const ordered = [...candidates].sort((a, b) => {
    const totalDiff = (state.totals.get(a.id) ?? 0) - (state.totals.get(b.id) ?? 0);
    if (totalDiff !== 0) return totalDiff;
    const lastDiff = (state.lastDate.get(a.id) ?? "").localeCompare(state.lastDate.get(b.id) ?? "");
    if (lastDiff !== 0) return lastDiff;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
  return ordered[0] ?? null;
}

/**
 * Monta o rascunho da escala. `excludedByDate` traz quem serve no programa
 * (fora do sorteio da data, liberado na edição manual).
 */
export function buildDutyRoster(
  dates: DutyDate[],
  sectors: DutySectorConfig[],
  persons: DutyPerson[],
  history: DutyHistoryEntry[],
  excludedByDate: Map<string, Set<string>>,
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
    const slots: DutySlotDraft[] = seats.map((seat) => {
      const candidates = persons.filter(
        (person) =>
          person.sex === "male" && person.flags[seat.dutyKey] === true && !excluded.has(person.id),
      );
      const picked = pickFair(candidates, state);
      if (picked) {
        state.totals.set(picked.id, (state.totals.get(picked.id) ?? 0) + 1);
        state.lastDate.set(picked.id, date);
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
