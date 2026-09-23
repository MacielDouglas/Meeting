import { getSectorIcon } from "@/features/cleaning/domain/cleaning-sector-icons";
import { dutyLabel } from "@/features/meeting-duties/domain/duty-labels";
import { DutyKeyIcon } from "@/features/meeting-duties/presentation/DutyKeyIcon";
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
}

export interface DesignacoesCardDay {
  date: string;
  kind: "midweek" | "weekend";
  time: string;
  cleaning: DesignacoesCardCleaning[];
  duties: DesignacoesCardDuty[];
}

function CleaningRows({ items }: { items: DesignacoesCardCleaning[] }) {
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
              <Icon aria-hidden size={18} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.sectorName}</span>
              <span className="max-w-[55%] shrink-0 truncate text-right text-muted-foreground">
                {item.personNames.join(" · ") || es.vacante}
                {item.isFamily ? " · familia" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DutyRows({ items }: { items: DesignacoesCardDuty[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={es.asignaciones}>
      <p className="text-xs font-semibold text-muted-foreground">{es.asignaciones}</p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={`${item.dutyKey}-${item.postLabel}-${item.side ?? ""}`}
            className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-b-0"
          >
            <DutyKeyIcon dutyKey={item.dutyKey} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {dutyLabel(item.dutyKey, item.dutyName)}
              {item.side ? (
                <span className="font-normal text-muted-foreground"> · {item.side}</span>
              ) : null}
            </span>
            <span className="max-w-[55%] shrink-0 truncate text-right text-muted-foreground">
              {item.personName || es.vacante}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DesignacoesCard({ day, lead }: { day: DesignacoesCardDay; lead: boolean }) {
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

      {empty ? (
        <p className="mt-4 text-sm text-muted-foreground">{es.sinDesignacionesProxima}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <DutyRows items={day.duties} />
          <CleaningRows items={day.cleaning} />
        </div>
      )}
    </Card>
  );
}

/**
 * Cards das próximas reuniões: o primeiro (reunião do dia ou próxima) em
 * destaque, os seguintes apagados como disabled. Só leitura, sem ações.
 */
export function DesignacoesCards({ days }: { days: DesignacoesCardDay[] }) {
  return (
    <div className="section-stack">
      {days.map((day, index) => (
        <div key={`${day.date}-${day.kind}`} className={cn(index > 0 && "opacity-60 saturate-50")}>
          <DesignacoesCard day={day} lead={index === 0} />
        </div>
      ))}
    </div>
  );
}
