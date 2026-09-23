"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaListOl, FaMeetup } from "react-icons/fa";
import {
  FaBars,
  FaBookOpen,
  FaClipboardList,
  FaGear,
  FaHouse,
  FaMoon,
  FaRightFromBracket,
  FaRightToBracket,
  FaSun,
  FaUserGroup,
  FaUsersGear,
  FaXmark,
} from "react-icons/fa6";
import { authClient } from "@/features/auth/presentation/auth-client";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

type Theme = "light" | "dark";

const THEME_KEY = "reuniones-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface SiteHeaderProps {
  showSettings: boolean;
  showAdmin: boolean;
  isAuthed: boolean;
  congregationName: string;
}

/**
 * Ilha client mínima: menu mobile, navegação desktop, alternador de tema e
 * estado ativo. O shell server entrega só primitivos (`showSettings`/
 * `showAdmin`/`isAuthed` e o nome da congregação).
 */
export function SiteHeader({
  showSettings,
  showAdmin,
  isAuthed,
  congregationName,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Tema nasce "light" igual ao server (hidratação idêntica); o valor real
  // do cliente assume no efeito abaixo, sem divergir do HTML do servidor.
  const [theme, setTheme] = useState<Theme>("light");
  const appliedTheme = useRef(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await authClient.signOut();
    } finally {
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  }

  useEffect(() => {
    setTheme(initialTheme());
  }, []);

  useEffect(() => {
    // Primeira aplicação pula: o theme-init.js já deixou a classe certa no
    // <html> antes da hidratação; reaplicar aqui causaria flash e escrita
    // redundante no armazenamento.
    if (!appliedTheme.current) {
      appliedTheme.current = true;
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* armazenamento indisponível: o tema vale só para a sessão */
    }
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isPersonas = pathname.startsWith("/personas") && activeTab !== "usuarios";
  const isUsuarios = pathname.startsWith("/personas") && activeTab === "usuarios";

  const items = [
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
      icon: FaListOl,
      match: (path: string) => path.startsWith("/designacoes"),
    },
    {
      href: "/personas",
      label: es.people,
      icon: FaUserGroup,
      match: () => isPersonas,
      privileged: true,
    },
    ...(showAdmin
      ? [
          {
            href: "/personas?tab=usuarios",
            label: es.usersTab,
            icon: FaUsersGear,
            match: () => isUsuarios,
          },
        ]
      : []),
    ...(showAdmin
      ? [
          {
            href: "/asignar",
            label: es.asignar,
            icon: FaClipboardList,
            match: (path: string) => path.startsWith("/asignar"),
          },
        ]
      : []),
    ...(showSettings
      ? [
          {
            href: "/configuracion",
            label: es.configuracion,
            icon: FaGear,
            match: (path: string) => path.startsWith("/configuracion"),
          },
        ]
      : []),
    ...(!isAuthed
      ? [
          {
            href: "/sign-in",
            label: es.signInTitle,
            icon: FaRightToBracket,
            match: (path: string) => path.startsWith("/sign-in"),
          },
        ]
      : []),
  ];

  const visibleItems = items.filter((item) => !("privileged" in item) || showAdmin);

  return (
    <header className="relative flex items-center gap-3">
      <Link
        href="/"
        aria-label="Meeting"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <FaMeetup aria-hidden size={26} />
      </Link>
      <div className="flex min-w-0 shrink-0 flex-col">
        <p className="font-display text-2xl font-semibold leading-none tracking-tight">Meeting</p>
        {congregationName.trim() !== "" && (
          <p className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-48">
            {congregationName}
          </p>
        )}
      </div>

      <nav
        aria-label="Navegación principal"
        className="ml-1 hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:flex"
      >
        {visibleItems
          .filter((item) => item.href !== "/")
          .map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 font-display text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
        <button
          type="button"
          // Tema é valor client-only (classe do <html> via theme-init.js):
          // o server sempre chuta "light"; o client assume sem remendar.
          suppressHydrationWarning
          aria-label={theme === "dark" ? es.switchToLight : es.switchToDark}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="grid h-11 w-11 place-items-center rounded-xl bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {theme === "dark" ? <FaSun aria-hidden size={18} /> : <FaMoon aria-hidden size={18} />}
        </button>
        <button
          type="button"
          aria-label={menuOpen ? es.closeMenu : es.menu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="grid h-11 w-11 place-items-center rounded-xl bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 sm:hidden"
        >
          {menuOpen ? <FaXmark aria-hidden size={18} /> : <FaBars aria-hidden size={18} />}
        </button>
        {isAuthed && (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            aria-label={es.signOut}
            title={es.signOut}
            className="hidden h-11 w-11 place-items-center rounded-xl bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:grid"
          >
            <FaRightFromBracket aria-hidden size={18} />
          </button>
        )}
      </div>

      {menuOpen && (
        <nav
          aria-label={es.menu}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-60 rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-lg"
        >
          <ul className="flex flex-col">
            {visibleItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {isAuthed && (
              <li>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => void handleSignOut()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-display text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                >
                  <FaRightFromBracket aria-hidden size={18} />
                  {es.signOut}
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
