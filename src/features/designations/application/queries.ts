import { asc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import { DESIGNATION_SECTORS_DEFAULTS } from "@/features/designations/domain/designation-defaults";
import {
  designationSectors,
  designationSlots,
} from "@/features/designations/infrastructure/designation-schema";
import { getDb } from "@/shared/lib/db";

export interface DesignationSlotItem {
  id: string;
  label: string;
}

export interface DesignationSectorItem {
  id: string;
  key: string | null;
  name: string;
  personFlag: string | null;
  enabled: boolean;
  peopleCount: number | null;
  isDefault: boolean;
  slots: DesignationSlotItem[];
}

export async function listDesignationConfig(): Promise<DesignationSectorItem[]> {
  await requireAuthenticatedUser();
  try {
    const db = getDb();
    const [sectorRows, slotRows] = await Promise.all([
      db.select().from(designationSectors).orderBy(asc(designationSectors.sortOrder)),
      db.select().from(designationSlots).orderBy(asc(designationSlots.sortOrder)),
    ]);

    // Se ainda não há nada, retorna os padrões como pré-visualização (sem gravar).
    if (sectorRows.length === 0) {
      return buildDefaultDesignationConfig();
    }

    const slotsBySector = new Map<string, DesignationSlotItem[]>();
    for (const slot of slotRows) {
      const list = slotsBySector.get(slot.sectorId) ?? [];
      list.push({ id: slot.id, label: slot.label });
      slotsBySector.set(slot.sectorId, list);
    }

    return sectorRows.map((sector) => ({
      id: sector.id,
      key: sector.key,
      name: sector.name,
      personFlag: sector.personFlag,
      enabled: sector.enabled,
      peopleCount: sector.peopleCount,
      isDefault: sector.isDefault,
      slots: slotsBySector.get(sector.id) ?? [],
    }));
  } catch {
    // Tabela ainda não migrada no banco: exibe os padrões para não quebrar a página.
    return buildDefaultDesignationConfig();
  }
}

function buildDefaultDesignationConfig(): DesignationSectorItem[] {
  return DESIGNATION_SECTORS_DEFAULTS.map((def, index) => ({
    id: `default-${def.key}`,
    key: def.key,
    name: def.name,
    personFlag: def.personFlag,
    enabled: true,
    peopleCount: def.defaultPeopleCount,
    isDefault: true,
    slots: def.defaultSlots.map((label, slotIndex) => ({
      id: `default-${def.key}-slot-${slotIndex}`,
      label,
    })),
    sortOrder: index,
  })) as DesignationSectorItem[];
}

export async function listEnabledDesignationSectors(): Promise<DesignationSectorItem[]> {
  const all = await listDesignationConfig();
  return all.filter((sector) => sector.enabled);
}
