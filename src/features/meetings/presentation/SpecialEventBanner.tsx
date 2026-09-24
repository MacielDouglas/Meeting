import { FaCalendarDay, FaClock, FaMicrophone, FaStar, FaUsers, FaUserTie } from "react-icons/fa";
import {
  formatEventRange,
  type SpecialEventVariant,
} from "@/features/meetings/domain/special-event-weeks";
import type { SpecialEventItem } from "@/features/settings/application/queries";
import { SPECIAL_EVENT_TYPES } from "@/features/settings/domain/settings";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

export type SpecialEventBannerVariant = SpecialEventVariant;

const VARIANT_STYLE: Record<SpecialEventBannerVariant, { icon: typeof FaUsers; cta: string }> = {
  assembly: { icon: FaUsers, cta: es.assemblyCta },
  celebration: { icon: FaStar, cta: es.celebrationCta },
  "special-talk": { icon: FaMicrophone, cta: es.specialTalkCta },
  "circuit-visit": { icon: FaUserTie, cta: es.visitCta },
};

function typeLabel(type: string): string {
  return SPECIAL_EVENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

interface SpecialEventBannerProps {
  event: SpecialEventItem;
  variant: SpecialEventBannerVariant;
  /** Nota extra da visita (meio de semana vai para terça). */
  showTuesdayNote?: boolean;
  compact?: boolean;
}

/**
 * Aviso chamativo do evento especial: tipo, título, datas, horário,
 * notas e chamada. Sem interatividade (serve no server e no client).
 */
export function SpecialEventBanner({
  event,
  variant,
  showTuesdayNote = false,
  compact = false,
}: SpecialEventBannerProps) {
  const style = VARIANT_STYLE[variant];
  const Icon = style.icon;
  return (
    <section
      aria-label={`${typeLabel(event.type)}: ${event.title}`}
      className="relative overflow-hidden rounded-2xl bg-accent text-accent-ink shadow-[0_16px_40px_-16px_rgb(0_0_0/0.45)] print:bg-white print:text-black print:shadow-none print:ring-1 print:ring-black"
    >
      <Icon
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-6 -right-6 opacity-15",
          compact ? "h-24 w-24" : "h-36 w-36",
        )}
      />
      <div className={cn("relative flex flex-col gap-2", compact ? "p-4" : "p-5 sm:p-6")}>
        <p
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-ink/15 font-display font-semibold tracking-wide",
            compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          <Icon aria-hidden size={compact ? 12 : 14} />
          {typeLabel(event.type)}
        </p>
        <h2
          className={cn(
            "font-display font-semibold tracking-tight text-balance",
            compact ? "text-xl" : "text-2xl sm:text-3xl",
          )}
        >
          {event.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarDay aria-hidden />
            {formatEventRange(event.startDate, event.endDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaClock aria-hidden />
            {event.startTime}
          </span>
        </p>
        {showTuesdayNote && <p className="text-sm font-semibold">{es.visitTuesdayNote}</p>}
        {event.notes && <p className="text-sm leading-relaxed opacity-90">{event.notes}</p>}
        <p
          className={cn("font-display font-medium text-balance", compact ? "text-sm" : "text-base")}
        >
          {style.cta}
        </p>
      </div>
    </section>
  );
}
