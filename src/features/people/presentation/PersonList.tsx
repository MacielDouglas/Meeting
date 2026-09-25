"use client";

import Link from "next/link";
import { useState } from "react";
import { FaCircleUser, FaMagnifyingGlass, FaUserPlus } from "react-icons/fa6";
import { getFullName, type PersonSummary } from "@/features/people/domain/person";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

interface PersonListProps {
  persons: PersonSummary[];
  canCreate: boolean;
}

export function PersonList({ persons, canCreate }: PersonListProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered =
    normalized.length === 0
      ? persons
      : persons.filter((person) => getFullName(person).toLowerCase().includes(normalized));

  return (
    <section aria-label={es.people} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-secondary px-3">
          <FaMagnifyingGlass aria-hidden className="shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={es.searchPeople}
            aria-label={es.searchPeople}
            maxLength={80}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:border focus:border-ring"
          />
        </div>
        {canCreate && (
          <Link
            href="/administracion/personas/nueva"
            aria-label={es.newPerson}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <FaUserPlus aria-hidden size={20} />
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        normalized.length > 0 ? (
          <EmptyState
            title={es.ningunaPersona}
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                {es.limpiarBusqueda}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<FaCircleUser aria-hidden size={22} />}
            title={es.noPeople}
            action={
              canCreate ? (
                <Link
                  href="/administracion/personas/nueva"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-display text-sm font-medium text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {es.newPerson}
                </Link>
              ) : undefined
            }
          />
        )
      ) : (
        <ul className="flex flex-col">
          {filtered.map((person) => (
            <li key={person.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/administracion/personas/${person.id}/editar`}
                className="flex items-center gap-3 py-2.5"
              >
                <FaCircleUser
                  aria-hidden
                  size={28}
                  className={cn(person.sex === "female" ? "text-rose-500" : "text-sky-500")}
                />
                <span className="sr-only">{person.sex === "female" ? es.sister : es.brother}</span>
                <span className="text-base">{getFullName(person)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
