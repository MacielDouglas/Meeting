"use server";

import { and, asc, eq, ilike, inArray, isNotNull, max, or } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import {
  meetingAssignments,
  meetingPrograms,
} from "@/features/meetings/infrastructure/meeting-schema";
import { FEMALE_RESTRICTED_KEYS } from "@/features/people/domain/person";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";
import { likeContains } from "@/shared/lib/validation";

export interface MeetingPerson {
  id: string;
  firstName: string;
  lastName: string;
  sex: "male" | "female";
  helper: boolean;
  unavailable: boolean;
  /** Última data na função do escopo (ou global, sem escopo); null = nunca. */
  lastAssignmentAt: string | null;
  familyHead: boolean;
  familyMemberId: string | null;
  /** Id do cabeça da família (próprio id quando é cabeça, null sem família). */
  familyGroupId: string | null;
}

/**
 * Escopo do rodízio por função: a "última designação" passa a ser a última
 * vez naquela função (parte + tipo de reunião + titular/ajudante), lida do
 * histórico de `meeting_assignments` em vez do carimbo global da pessoa.
 * Ex.: presidente do fim de semana = parte `president` em programas `weekend`.
 */
export interface MeetingRotationScope {
  partKeys: string[];
  kinds?: ("midweek" | "weekend")[];
  /** "person" (titular/dirigente/presidente) ou "helper" (ajudante/leitor). */
  holder?: "person" | "helper";
}

const CAPABILITY_COLUMNS = {
  prayer: persons.prayer,
  midweekChairman: persons.midweekChairman,
  treasuresTalk: persons.treasuresTalk,
  pearlsQuest: persons.pearlsQuest,
  bibleReading: persons.bibleReading,
  helper: persons.helper,
  startConversations: persons.startConversations,
  returnVisits: persons.returnVisits,
  makeDisciples: persons.makeDisciples,
  explainBeliefs: persons.explainBeliefs,
  betterSpeech: persons.betterSpeech,
  analysisTalk: persons.analysisTalk,
  bibleStudy: persons.bibleStudy,
  studyReader: persons.studyReader,
  publicChairman: persons.publicChairman,
  publicTalk: persons.publicTalk,
  watchtowerConductor: persons.watchtowerConductor,
  watchtowerReader: persons.watchtowerReader,
} as const;

export async function listMeetingPersons(
  capabilityField?: string | null,
  options?: {
    search?: string;
    limit?: number;
    helperOnly?: boolean;
    includeUnavailable?: boolean;
    orderBy?: "name" | "rotation";
    rotationScope?: MeetingRotationScope;
  },
): Promise<MeetingPerson[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const conditions = [];
  const field =
    capabilityField && capabilityField in CAPABILITY_COLUMNS
      ? CAPABILITY_COLUMNS[capabilityField as keyof typeof CAPABILITY_COLUMNS]
      : null;
  if (field) conditions.push(eq(field, true));
  // "Qué dirías": ancião OU servo ministerial (só homens).
  if (capabilityField === "elderOrServant") {
    conditions.push(or(eq(persons.elder, true), eq(persons.ministerialServant, true)));
    conditions.push(eq(persons.sex, "male"));
  }
  // Defesa em profundidade: partes restritas a homens nunca listam mulheres,
  // mesmo se o cadastro estiver inconsistente (o formulário já normaliza).
  if (capabilityField && (FEMALE_RESTRICTED_KEYS as readonly string[]).includes(capabilityField)) {
    conditions.push(eq(persons.sex, "male"));
  }
  // Indisponíveis ficam de fora por padrão (TheocBase: unavailability).
  if (!options?.includeUnavailable) conditions.push(eq(persons.unavailable, false));
  if (options?.helperOnly) conditions.push(eq(persons.helper, true));
  const search = options?.search?.trim();
  if (search) {
    const pattern = likeContains(search);
    const searchCondition = or(ilike(persons.firstName, pattern), ilike(persons.lastName, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 200);
  const scope = options?.rotationScope;
  const scopedRotation =
    options?.orderBy === "rotation" && scope !== undefined && scope.partKeys.length > 0;
  const baseQuery = db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
      helper: persons.helper,
      unavailable: persons.unavailable,
      lastAssignmentAt: persons.lastAssignmentAt,
      familyHead: persons.familyHead,
      familyMemberId: persons.familyMemberId,
    })
    .from(persons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      // Rodízio global mantém a ordem do SQL; com escopo, o ranking por
      // função é refeito em JS (ordem alfabética aqui é só determinismo).
      ...(!scopedRotation && options?.orderBy === "rotation"
        ? [asc(persons.lastAssignmentAt), asc(persons.firstName), asc(persons.lastName)]
        : [asc(persons.firstName), asc(persons.lastName)]),
    );
  // Com escopo, o ranking é feito em JS sobre o histórico da função — busca
  // sem limite SQL e fatia depois de ordenar (a congregação é pequena).
  const rows = scopedRotation ? await baseQuery : await baseQuery.limit(limit);

  let lastByPerson: Map<string, string> | null = null;
  if (scopedRotation && scope) {
    lastByPerson = await readFunctionHistory(
      scope,
      scope.holder === "helper" ? meetingAssignments.helperPersonId : meetingAssignments.personId,
    );
  }

  const people = rows.map((row) => {
    // Com escopo, o subtítulo da lista mostra a última vez NAQUELA função
    // (null = nunca exerceu → prioridade no rodízio).
    const lastAssignmentAt = scopedRotation
      ? (lastByPerson?.get(row.id) ?? null)
      : (row.lastAssignmentAt?.toISOString() ?? null);
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      sex: row.sex as "male" | "female",
      helper: row.helper ?? false,
      unavailable: row.unavailable ?? false,
      lastAssignmentAt,
      familyHead: row.familyHead ?? false,
      familyMemberId: row.familyMemberId ?? null,
      familyGroupId: row.familyHead ? row.id : (row.familyMemberId ?? null),
    };
  });

  if (!scopedRotation) return people;
  // Rodízio por função: quem nunca exerceu primeiro; depois do mais antigo
  // ao mais novo; desempate alfabético. Fatia no limite pedido.
  return people
    .sort((a, b) => {
      if (a.lastAssignmentAt === null && b.lastAssignmentAt !== null) return -1;
      if (a.lastAssignmentAt !== null && b.lastAssignmentAt === null) return 1;
      if (a.lastAssignmentAt !== null && b.lastAssignmentAt !== null) {
        if (a.lastAssignmentAt !== b.lastAssignmentAt) {
          return a.lastAssignmentAt < b.lastAssignmentAt ? -1 : 1;
        }
      }
      if (a.firstName !== b.firstName) return a.firstName < b.firstName ? -1 : 1;
      return a.lastName < b.lastName ? -1 : 1;
    })
    .slice(0, limit);
}

/**
 * Última data por pessoa na função do escopo (parte + tipo de reunião),
 * lida do histórico salvo. Datas são "AAAA-MM-DD": MAX lexicográfico vale.
 */
async function readFunctionHistory(
  scope: MeetingRotationScope,
  holderColumn: typeof meetingAssignments.personId | typeof meetingAssignments.helperPersonId,
): Promise<Map<string, string>> {
  const historyConditions = [
    inArray(meetingAssignments.partKey, scope.partKeys),
    isNotNull(holderColumn),
  ];
  if (scope.kinds && scope.kinds.length > 0) {
    historyConditions.push(inArray(meetingPrograms.kind, scope.kinds));
  }
  const historyRows = await getDb()
    .select({ personId: holderColumn, lastDate: max(meetingPrograms.date) })
    .from(meetingAssignments)
    .innerJoin(meetingPrograms, eq(meetingAssignments.programId, meetingPrograms.id))
    .where(and(...historyConditions))
    .groupBy(holderColumn);
  const lastByPerson = new Map<string, string>();
  for (const row of historyRows) {
    if (row.personId && row.lastDate) lastByPerson.set(row.personId, row.lastDate);
  }
  return lastByPerson;
}
