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
}

/**
 * Ilha client mínima: só decide a aba ativa via `useSearchParams` para
 * feedback instantâneo. A página continua server e passa `href`s prontos.
 */
export function TabNav({ items, param = "tab", defaultValue, ariaLabel }: TabNavProps) {
  const searchParams = useSearchParams();
  const active = searchParams.get(param) ?? defaultValue;

  return (
    <nav aria-label={ariaLabel} className="flex gap-1 rounded-xl bg-secondary p-1">
      {items.map((item) => {
        const isActive = active === item.value;
        return (
          <Link
            key={item.value}
            href={item.href}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-8 flex-1 rounded-lg px-3 text-center font-display text-sm font-medium leading-8 transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
