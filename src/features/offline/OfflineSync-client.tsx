"use client";

import { useEffect, useRef } from "react";
import { syncOfflineWeeks } from "@/features/offline/offline-sync-actions";
import { purgeOtherOwners, writeOfflineSync } from "@/features/offline/schedule-cache";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MIN_SYNC_GAP_MS = 30 * 60 * 1000;

/**
 * Ilha mínima: enquanto logado e online, baixa o pacote das 2 semanas
 * (atual + próxima) para o IndexedDB. Roda no login, ao voltar à aba e a
 * cada 6h (mínimo 30 min entre execuções).
 */
export function OfflineSync() {
  const lastRun = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!navigator.onLine) return;
      if (Date.now() - lastRun.current < MIN_SYNC_GAP_MS) return;
      lastRun.current = Date.now();
      try {
        const payload = await syncOfflineWeeks();
        if (cancelled || !payload) return;
        await writeOfflineSync(payload);
        await purgeOtherOwners(payload.ownerKey);
      } catch {
        // Sync best-effort: o cache anterior continua valendo.
      }
    }

    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    const onOnline = () => void run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(run, SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
