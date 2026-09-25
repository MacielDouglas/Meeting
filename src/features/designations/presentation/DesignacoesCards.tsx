import { getSectorIcon } from "@/features/cleaning/domain/cleaning-sector-icons";
import { dutyLabel } from "@/features/meeting-duties/domain/duty-labels";
import { DutyKeyIcon } from "@/features/meeting-duties/presentation/DutyKeyIcon";
import type { SpecialEventVariant } from "@/features/meetings/domain/special-event-weeks";
import { SpecialEventBanner } from "@/features/meetings/presentation/SpecialEventBanner";
import type { SpecialEventItem } from "@/features/settings/application/queries";
import { formatShortDay, formatWeekday } from "@/features/weekly-schedule/domain/my-week";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

export interface DesignacoesCardCleaning {
  typeKey: string;
  sectorKey: string;
  sectorName: string;
  personNames: string[];
  isFamily: boolean;
}

export interface DesignacoesCardDuty {
  dutyKey: string;
  dutyName: string;
  postLabel: string;
  side: string | null;
  personName: string;
  sortOrder: number;
}

export interface DesignacoesCardDay {
  date: string;
  kind: "midweek" | "weekend";
  time: string;
  notice?: { variant: SpecialEventVariant; event: SpecialEventItem } | null;
  cleaning: DesignacoesCardCleaning[];
  duties: DesignacoesCardDuty[];
}

/** Nome próprio em destaque: a pessoa vinculada ao usuário vê suas fileiras. */
function isHighlight(name: string, highlightName: string | null): boolean {
  if (!highlightName || highlightName.trim() === "") return false;
  return name.trim().toLowerCase() === highlightName.trim().toLowerCase();
}

function CleaningRows({
  items,
  highlightName,
}: {
  items: DesignacoesCardCleaning[];
  highlightName: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={es.cleaning}>
      <p className="text-xs font-semibold text-muted-foreground">{es.cleaning}</p>
      <ul className="flex flex-col">
        {items.map((item) => {
          const Icon = getSectorIcon(item.typeKey, item.sectorKey);
          return (
            <li
              key={`${item.sectorKey}-${item.sectorName}`}
              className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0"
            >
              <Icon aria-hidden size={18} className="shrink-0 text-muted-foreground" />
              <span title={item.sectorName} className="min-w-0 flex-1 truncate font-medium">
                {item.sectorName}
              </span>
              <span
                title={`${item.personNames.join(" · ")}${item.isFamily ? ` · ${es.familiaMinuscula}` : ""}`}
                className="max-w-[55%] shrink-0 break-words text-right leading-snug text-muted-foreground line-clamp-2"
              >
                {item.personNames.length === 0 ? (
                  es.sinAsignar
                ) : (
                  <>
                    {item.personNames.map((name, index) => (
                      <span key={name}>
                        {index > 0 ? " · " : null}
                        {isHighlight(name, highlightName) ? (
                          <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-accent-ink">
                            {name}
                          </span>
                        ) : (
                          name
                        )}
                      </span>
                    ))}
                    {item.isFamily ? ` · ${es.familiaMinuscula}` : ""}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DutyRows({
  items,
  highlightName,
}: {
  items: DesignacoesCardDuty[];
  highlightName: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={es.asignaciones}>
      <p className="text-xs font-semibold text-muted-foreground">{es.asignaciones}</p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={`${item.dutyKey}-${item.sortOrder}`}
            className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0"
          >
            <DutyKeyIcon dutyKey={item.dutyKey} />
            <span
              title={dutyLabel(item.dutyKey, item.dutyName)}
              className="min-w-0 flex-1 truncate font-medium"
            >
              {dutyLabel(item.dutyKey, item.dutyName)}
              {item.side ? (
                <span className="font-normal text-muted-foreground"> · {item.side}</span>
              ) : null}
            </span>
            <span
              title={item.personName || es.sinAsignar}
              className="max-w-[55%] shrink-0 break-words text-right leading-snug text-muted-foreground line-clamp-2"
            >
              {isHighlight(item.personName, highlightName) ? (
                <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-accent-ink">
                  {item.personName}
                </span>
              ) : (
                item.personName || es.sinAsignar
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DesignacoesCard({
  day,
  lead,
  highlightName,
}: {
  day: DesignacoesCardDay;
  lead: boolean;
  highlightName: string | null;
}) {
  const empty = day.cleaning.length === 0 && day.duties.length === 0;
  return (
    <Card className={cn("p-4 sm:p-5", lead && "ring-2 ring-accent")}>
      <div
        className={cn(
          "flex flex-col gap-1 rounded-xl px-3 py-3",
          lead ? "bg-accent text-accent-ink" : "bg-secondary",
        )}
      >
        <h2
          className={cn(
            "break-words text-xs font-medium",
            lead ? "text-accent-ink" : "text-muted-foreground",
          )}
        >
          {day.kind === "midweek" ? es.entreSemana : es.finSemana}
        </h2>
        <p className="break-words font-display text-3xl font-semibold tabular-nums leading-none tracking-tight">
          {formatWeekday(day.date)} {formatShortDay(day.date)} · {day.time}
        </p>
      </div>

      {empty && !day.notice ? (
        <p className="mt-4 text-sm text-muted-foreground">{es.sinDesignacionesDia}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {day.notice ? (
            <SpecialEventBanner
              event={day.notice.event}
              variant={day.notice.variant}
              showTuesdayNote={day.kind === "midweek" && day.notice.variant === "circuit-visit"}
              compact
            />
          ) : null}
          <DutyRows items={day.duties} highlightName={highlightName} />
          <CleaningRows items={day.cleaning} highlightName={highlightName} />
        </div>
      )}
    </Card>
  );
}

/**
 * Cards das próximas reuniões: o primeiro (reunião do dia ou próxima) em
 * destaque com ring e cabeçalho em acento; os seguintes recuam só no
 * cabeçalho (papel suave), sem opacidade — legível sob sol. Só leitura.
 */
export function DesignacoesCards({
  days,
  highlightName = null,
}: {
  days: DesignacoesCardDay[];
  highlightName?: string | null;
}) {
  return (
    <div className="section-stack">
      {days.map((day, index) => (
        <DesignacoesCard
          key={`${day.date}-${day.kind}`}
          day={day}
          lead={index === 0}
          highlightName={highlightName}
        />
      ))}
    </div>
  );
}
