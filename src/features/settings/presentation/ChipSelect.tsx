"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/utils";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipSelectProps<T extends string> {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChipSelectProps<T>) {
  const labelId = useId();
  return (
    <fieldset aria-labelledby={labelId} className="flex flex-col gap-1 py-1">
      <span id={labelId} className="text-sm text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-3 py-2 font-display text-sm font-medium transition-colors",
              value === option.value
                ? "border-transparent bg-accent text-accent-ink"
                : "border-input text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
