"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBookOpen, FaBroom, FaGear, FaHouse, FaUserGroup } from "react-icons/fa6";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

const ITEMS = [
  { href: "/", label: es.home, icon: FaHouse, match: (path: string) => path === "/" },
  {
    href: "/reunioes",
    label: es.tabReuniones,
    icon: FaBookOpen,
    match: (path: string) => path.startsWith("/reunioes"),
  },
  {
    href: "/designacoes",
    label: es.tabDesignaciones,
    icon: FaBroom,
    match: (path: string) => path.startsWith("/designacoes"),
  },
  {
    href: "/personas",
    label: es.people,
    icon: FaUserGroup,
    match: (path: string) => path.startsWith("/personas"),
  },
  {
    href: "/configuracion",
    label: es.configuracion,
    icon: FaGear,
    match: (path: string) => path.startsWith("/configuracion"),
    ownerOnly: true,
  },
] as const;

export function BottomNav({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();
  const visibleItems = ITEMS.filter((item) => !("ownerOnly" in item) || showSettings);
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background sm:hidden"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] sm:max-w-[42rem] lg:max-w-[56rem]">
        {visibleItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-xl p-2 transition-colors",
                  active && "bg-secondary",
                )}
              >
                <Icon aria-hidden size={20} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
