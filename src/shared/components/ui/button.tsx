import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-accent text-accent-ink active:scale-[0.98]",
  secondary: "bg-secondary text-secondary-foreground active:scale-[0.98]",
  outline: "border border-input bg-background active:scale-[0.98]",
  ghost: "text-foreground",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-full font-display text-base font-medium uppercase tracking-wider transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "sm:w-auto",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
