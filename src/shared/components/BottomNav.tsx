"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHouse, FaUserGroup } from "react-icons/fa6";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

const ITEMS = [
  { href: "/", label: es.home, icon: FaHouse, match: (path: string) => path === "/" },
  {
    href: "/personas",
    label: es.people,
    icon: FaUserGroup,
    match: (path: string) => path.startsWith("/personas"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                active ? "text-sky-500" : "text-muted-foreground",
              )}
            >
              <Icon aria-hidden size={22} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
