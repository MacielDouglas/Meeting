"use client";

import type { PersonCleaningHistory } from "@/features/cleaning/application/cleaning-program-queries";
import { getSectorIcon } from "@/features/cleaning/domain/cleaning-sector-icons";

interface CleaningHistoryBadgeProps {
  history: PersonCleaningHistory[];
  currentSectorKey: string;
  typeKey: string;
}

export function CleaningHistoryBadge({
  history,
  currentSectorKey,
  typeKey,
}: CleaningHistoryBadgeProps) {
  if (history.length === 0) return null;

  return (
    <span
      className="flex items-center gap-0.5"
      title={history.map((h) => `${h.sectorName} (${h.assignmentDate})`).join(", ")}
    >
      {history.map((h) => {
        const Icon = getSectorIcon(typeKey, h.sectorKey);
        const isSameSector = h.sectorKey === currentSectorKey;
        return (
          <span
            key={`${h.sectorKey}-${h.assignmentDate}`}
            className={isSameSector ? "text-red-500" : "text-sky-500"}
            title={`${h.sectorName} — ${h.assignmentDate}`}
          >
            <Icon size={12} />
          </span>
        );
      })}
    </span>
  );
}
