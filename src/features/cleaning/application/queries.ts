import { asc, eq } from "drizzle-orm";
import { requirePrivilegedUser } from "@/features/auth/application/session";
import {
  CLEANING_SECTORS_DEFAULTS,
  CLEANING_TYPES,
  type CleaningAssignmentMode,
  type CleaningTypeKey,
  type RequiredSex,
} from "@/features/cleaning/domain/cleaning-defaults";
import { cleaningSectors, cleaningTypes } from "@/features/cleaning/infrastructure/cleaning-schema";
import { getDb } from "@/shared/lib/db";

export interface CleaningSectorItem {
  id: string;
  key: string | null;
  name: string;
  task: string;
  enabled: boolean;
  peopleCount: number | null;
  requiredSex: RequiredSex;
  allowYoung: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface CleaningTypeItem {
  key: CleaningTypeKey;
  label: string;
  description: string;
  enabled: boolean;
  assignmentMode: CleaningAssignmentMode;
  sectors: CleaningSectorItem[];
}

export async function listCleaningConfig(): Promise<CleaningTypeItem[]> {
  await requirePrivilegedUser();
  try {
    const db = getDb();
    const [typeRows, sectorRows] = await Promise.all([
      db.select().from(cleaningTypes),
      db.select().from(cleaningSectors).orderBy(asc(cleaningSectors.sortOrder)),
    ]);
    const typeByKey = new Map(typeRows.map((row) => [row.key, row]));

    // Tabela existe mas está vazia (primeira execução): mostra os padrões sem gravar.
    if (sectorRows.length === 0 && typeRows.length === 0) return buildDefaultCleaningConfig();

    return CLEANING_TYPES.map((def) => {
      const row = typeByKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        enabled: row?.enabled ?? true,
        assignmentMode: (row?.assignmentMode ?? "person") as CleaningAssignmentMode,
        sectors: sectorRows
          .filter((sector) => sector.cleaningTypeKey === def.key)
          .map((sector) => ({
            id: sector.id,
            key: sector.key,
            name: sector.name,
            task: sector.task,
            enabled: sector.enabled,
            peopleCount: sector.peopleCount,
            requiredSex: sector.requiredSex as RequiredSex,
            allowYoung: sector.allowYoung ?? true,
            isDefault: sector.isDefault,
            sortOrder: sector.sortOrder,
          })),
      };
    });
  } catch {
    // Tabela ainda não migrada no banco: exibe os padrões para não quebrar a página.
    return buildDefaultCleaningConfig();
  }
}

function buildDefaultCleaningConfig(): CleaningTypeItem[] {
  return CLEANING_TYPES.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    enabled: true,
    assignmentMode: "person" as CleaningAssignmentMode,
    sectors: CLEANING_SECTORS_DEFAULTS.filter((sector) => sector.typeKey === def.key).map(
      (sector, index) => ({
        id: `default-${def.key}-${sector.key}`,
        key: sector.key,
        name: sector.name,
        task: sector.task,
        enabled: true,
        peopleCount: null,
        requiredSex: "any" as RequiredSex,
        allowYoung: !["banheiro_masculino", "banheiro_feminino", "banheiros"].includes(sector.key),
        isDefault: true,
        sortOrder: index,
      }),
    ),
  }));
}

export async function listEnabledDesignationFlags(): Promise<string[]> {
  await requirePrivilegedUser();
  try {
    const { designationSectors } = await import(
      "@/features/designations/infrastructure/designation-schema"
    );
    const rows = await getDb()
      .select({ personFlag: designationSectors.personFlag, enabled: designationSectors.enabled })
      .from(designationSectors);
    if (rows.length === 0) return ["usher", "sound", "video", "microphone", "platform"];
    return rows
      .filter((row) => row.enabled && row.personFlag)
      .map((row) => row.personFlag as string);
  } catch {
    return ["usher", "sound", "video", "microphone", "platform"];
  }
}

// Regras de elegibilidade para o sorteio futuro da limpeza.
export interface CleaningEligibility {
  peopleCount: number | null;
  requiredSex: RequiredSex;
  allowYoung: boolean;
}

export function isPersonEligibleForCleaning(
  person: { sex: "male" | "female"; cleaning: boolean; young?: boolean | null },
  rule: CleaningEligibility,
  relaxYoung = false,
): boolean {
  if (!person.cleaning) return false;
  if (rule.requiredSex === "male" && person.sex !== "male") return false;
  if (rule.requiredSex === "female" && person.sex !== "female") return false;
  if (!rule.allowYoung && person.young && !relaxYoung) return false;
  return true;
}

export async function getCleaningSectorRule(sectorId: string): Promise<CleaningEligibility | null> {
  await requirePrivilegedUser();
  if (sectorId.startsWith("default-"))
    return { peopleCount: null, requiredSex: "any", allowYoung: true };
  try {
    const rows = await getDb()
      .select({
        peopleCount: cleaningSectors.peopleCount,
        requiredSex: cleaningSectors.requiredSex,
        allowYoung: cleaningSectors.allowYoung,
      })
      .from(cleaningSectors)
      .where(eq(cleaningSectors.id, sectorId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      peopleCount: row.peopleCount,
      requiredSex: row.requiredSex as RequiredSex,
      allowYoung: row.allowYoung ?? true,
    };
  } catch {
    return null;
  }
}
