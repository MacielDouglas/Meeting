"use client";

import { cn } from "@/shared/lib/utils";

interface SegmentedOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabledValues?: string[];
  small?: boolean;
}

/**
 * Controle segmentado único do sistema (trilho 40px, opção 32px): mesma
 * gramática para filtros, ordenações e seletores. Estado via `aria-pressed`.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  disabledValues = [],
  small = false,
}: SegmentedControlProps) {
  return (
    <fieldset className="m-0 flex rounded-xl border-0 bg-secondary p-1">
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => {
        const active = value === option.value;
        const disabled = disabledValues.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 flex-1 rounded-lg px-2 font-display transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
              small ? "text-xs" : "text-sm",
              active
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
