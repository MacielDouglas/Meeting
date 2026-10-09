import { openDB } from "idb";
import type { OfflineSyncPayload } from "@/features/offline/offline-sync-actions";
import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

const DB_NAME = "meeting-pwa";
const STORE_NAME = "keyval";
const SCHEDULE_KEY = "weekly-schedule";

/** Cache offline das 2 semanas (store próprio, chave por usuário). */
const OFFLINE_STORE = "offline";
const OFFLINE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function syncKey(ownerKey: string): string {
  return `sync:${ownerKey}`;
}

async function getStore() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });
  return db;
}

async function getOfflineDb() {
  return openDB(DB_NAME, 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
      if (!database.objectStoreNames.contains(OFFLINE_STORE)) {
        database.createObjectStore(OFFLINE_STORE);
      }
    },
  });
}

export async function readCachedSchedule(): Promise<WeeklySchedule | null> {
  try {
    const db = await getStore();
    const value = await db.get(STORE_NAME, SCHEDULE_KEY);
    return (value as WeeklySchedule | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function writeCachedSchedule(schedule: WeeklySchedule): Promise<void> {
  try {
    const db = await getStore();
    await db.put(STORE_NAME, schedule, SCHEDULE_KEY);
  } catch {
    // Cache is best-effort; online render still works.
  }
}

/** Grava o pacote das 2 semanas (atual + próxima) do usuário. */
export async function writeOfflineSync(payload: OfflineSyncPayload): Promise<void> {
  const db = await getOfflineDb();
  await db.put(OFFLINE_STORE, payload, syncKey(payload.ownerKey));
}

/** Lê o pacote do usuário (null se ausente ou mais velho que o TTL). */
export async function readOfflineSync(ownerKey: string): Promise<OfflineSyncPayload | null> {
  try {
    const db = await getOfflineDb();
    const value = (await db.get(OFFLINE_STORE, syncKey(ownerKey))) as
      | OfflineSyncPayload
      | undefined;
    if (!value) return null;
    if (Date.now() - new Date(value.savedAt).getTime() > OFFLINE_TTL_MS) return null;
    return value;
  } catch {
    return null;
  }
}

/** Todos os pacotes válidos (para a página offline sem saber o dono). */
export async function readAllOfflineSyncs(): Promise<OfflineSyncPayload[]> {
  try {
    const db = await getOfflineDb();
    const keys = await db.getAllKeys(OFFLINE_STORE);
    const out: OfflineSyncPayload[] = [];
    for (const key of keys) {
      if (typeof key !== "string" || !key.startsWith("sync:")) continue;
      const value = (await db.get(OFFLINE_STORE, key)) as OfflineSyncPayload | undefined;
      if (!value) continue;
      if (Date.now() - new Date(value.savedAt).getTime() > OFFLINE_TTL_MS) continue;
      out.push(value);
    }
    return out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}

/** Apaga pacotes de outros usuários (higiene em aparelho compartilhado). */
export async function purgeOtherOwners(ownerKey: string): Promise<void> {
  try {
    const db = await getOfflineDb();
    const keys = await db.getAllKeys(OFFLINE_STORE);
    const keep = syncKey(ownerKey);
    for (const key of keys) {
      if (typeof key === "string" && key.startsWith("sync:") && key !== keep) {
        await db.delete(OFFLINE_STORE, key);
      }
    }
  } catch {
    // Higiene best-effort.
  }
}

/** Limpa todo o offline (logout): nenhum dado fica no aparelho. */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.clear(OFFLINE_STORE);
    await db.delete(STORE_NAME, SCHEDULE_KEY);
  } catch {
    // Best-effort.
  }
}
