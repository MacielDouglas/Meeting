"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { PersonOption, UserWithRole } from "@/features/people/application/queries";
import type { PersonSummary } from "@/features/people/domain/person";
import { TableSkeleton } from "@/shared/components/skeletons";

// Abas em chunks sob demanda; dados já buscados no server.
const PersonList = dynamic(
  () => import("@/features/people/presentation/PersonList").then((module) => module.PersonList),
  { ssr: false },
);
const UserList = dynamic(
  () => import("@/features/people/presentation/UserList").then((module) => module.UserList),
  { ssr: false },
);

interface PersonasTabsProps {
  tab: "personas" | "usuarios";
  persons: PersonSummary[];
  users: UserWithRole[];
  canCreate: boolean;
  currentUserId: string;
  isOwner: boolean;
  joinTokenByUserId?: Record<string, { code: string; expiresAt: string }>;
  unlinkedPersons?: PersonOption[];
}

export function PersonasTabs({
  tab,
  persons,
  users,
  canCreate,
  currentUserId,
  isOwner,
  joinTokenByUserId = {},
  unlinkedPersons = [],
}: PersonasTabsProps) {
  if (tab === "usuarios") {
    return (
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <UserList
          users={users}
          currentUserId={currentUserId}
          isOwner={isOwner}
          joinTokenByUserId={joinTokenByUserId}
          unlinkedPersons={unlinkedPersons}
        />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <PersonList persons={persons} canCreate={canCreate} />
    </Suspense>
  );
}
