"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";

interface TabNavItem {
  value: string;
  label: string;
  href: string;
}

interface TabNavProps {
  items: TabNavItem[];
  param?: string;
  defaultValue: string;
  ariaLabel: string;
  variant?: "pill" | "segmented";
}

/**
 * Ilha client mínima: só decide a aba ativa via `useSearchParams` para
 * feedback instantâneo. A página continua server e passa `href`s prontos.
 */
export function TabNav({
  items,
  param = "tab",
  defaultValue,
  ariaLabel,
  variant = "pill",
}: TabNavProps) {
  const searchParams = useSearchParams();
  const active = searchParams.get(param) ?? defaultValue;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(variant === "pill" ? "flex gap-2" : "flex gap-1 rounded-xl bg-secondary p-1")}
    >
      {items.map((item) => {
        const isActive = active === item.value;
        return (
          <Link
            key={item.value}
            href={item.href}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 px-3 text-center text-sm font-medium transition-colors",
              variant === "pill"
                ? cn(
                    "h-9 rounded-full leading-9",
                    isActive ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground",
                  )
                : cn(
                    "rounded-lg py-2",
                    isActive ? "bg-background shadow-sm" : "text-muted-foreground",
                  ),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
