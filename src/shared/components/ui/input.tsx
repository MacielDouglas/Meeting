import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength = 80,
  required = false,
}: TextFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={id} className="shrink-0 text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full max-w-55 rounded-lg border border-transparent bg-secondary px-3 text-right text-sm outline-none focus:border-ring"
      />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={id} className={cn("shrink-0 text-sm font-medium")}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full max-w-55 rounded-lg border border-transparent bg-secondary px-3 text-right text-sm outline-none focus:border-ring disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  control: ReactNode;
}

export function FieldRow({ label, control }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      {control}
    </div>
  );
}
