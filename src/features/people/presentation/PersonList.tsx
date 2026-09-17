"use client";

import Link from "next/link";
import { useState } from "react";
import { FaCircleUser, FaMagnifyingGlass, FaUserPlus } from "react-icons/fa6";
import { getFullName, type PersonSummary } from "@/features/people/domain/person";
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
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {canCreate && (
          <Link
            href="/personas/nueva"
            aria-label={es.newPerson}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <FaUserPlus aria-hidden size={20} />
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{es.noPeople}</p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map((person) => (
            <li key={person.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/personas/${person.id}/editar`}
                className="flex items-center gap-3 py-2.5"
              >
                <FaCircleUser
                  aria-hidden
                  size={28}
                  className={cn(person.sex === "female" ? "text-rose-500" : "text-sky-500")}
                />
                <span className="text-base">{getFullName(person)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
