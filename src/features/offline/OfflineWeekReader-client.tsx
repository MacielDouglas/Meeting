"use client";

import { useEffect, useState } from "react";
import type {
  OfflineSyncPayload,
  OfflineWeekBundle,
} from "@/features/offline/offline-sync-actions";
import { readAllOfflineSyncs } from "@/features/offline/schedule-cache";
import { Card, CardDescription } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { formatDateBR } from "@/shared/lib/format-date";

function assignmentsOf(bundle: OfflineWeekBundle) {
  return [
    { kind: "midweek" as const, data: bundle.midweek },
    { kind: "weekend" as const, data: bundle.weekend },
  ];
}

/**
 * Ilha da página `~offline`: lê o pacote mais recente do IndexedDB (qualquer
 * usuário do aparelho) e mostra as 2 semanas guardadas, só leitura.
 */
export function OfflineWeekReader() {
  const [payload, setPayload] = useState<OfflineSyncPayload | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readAllOfflineSyncs().then((all) => {
      if (!cancelled) {
        setPayload(all[0] ?? null);
        setDone(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!done) return null;
  if (!payload) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col">
        <p className="text-xs font-semibold text-success">{es.offlineGuardado}</p>
        {payload.personName && (
          <p className="mt-1 text-sm font-medium">
            {payload.personName}
            {payload.congregationName ? ` · ${payload.congregationName}` : ""}
          </p>
        )}
      </div>
      {payload.weeks.map((week) => (
        <section key={week.weekStart} aria-label={`${formatDateBR(week.weekStart)}`}>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {formatDateBR(week.weekStart)} – {formatDateBR(week.weekEnd)}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {assignmentsOf(week).map(({ kind, data }) => (
              <div key={kind}>
                <h3 className="text-sm font-semibold">
                  {kind === "midweek" ? es.reunionEntreSemana : es.reunionFinSemana}
                </h3>
                {!data || data.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{es.programaNoEncontrado}</p>
                ) : (
                  <ul className="mt-1 flex flex-col divide-y divide-border">
                    {data.assignments.map((part) => (
                      <li key={part.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                        <span className="w-11 shrink-0 tabular-nums text-muted-foreground">
                          {part.startTime}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium break-words">
                            {part.songNumber ? `Canción ${part.songNumber}` : part.title}
                            {part.durationMinutes ? ` · ${part.durationMinutes} min` : ""}
                          </span>
                          {(part.subtitle || part.songTheme) && (
                            <span className="block text-xs text-muted-foreground">
                              {[part.subtitle, part.songTheme].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {(part.personName || part.helperPersonName) && (
                            <span className="block text-right text-xs font-semibold">
                              {[part.personName, part.helperPersonName].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {(week.cleaning.length > 0 || week.duties.length > 0) && (
            <div className="mt-2 flex flex-col gap-1 text-sm">
              {week.cleaning.length > 0 && (
                <p>
                  <span className="font-semibold">{es.miLimpieza}: </span>
                  {week.cleaning
                    .map((c) => `${formatDateBR(c.assignmentDate)} · ${c.sectorName}`)
                    .join(" · ")}
                </p>
              )}
              {week.duties.length > 0 && (
                <p>
                  <span className="font-semibold">{es.enLaReunion}: </span>
                  {week.duties
                    .map((d) => `${formatDateBR(d.assignmentDate)} · ${d.postLabel}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
        </section>
      ))}
      <CardDescription>
        {es.offlineDescription} {formatDateBR(payload.savedAt.slice(0, 10))}.
      </CardDescription>
    </Card>
  );
}
