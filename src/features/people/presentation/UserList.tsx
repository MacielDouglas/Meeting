"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUserRole } from "@/features/people/application/actions";
import type { UserWithRole } from "@/features/people/application/queries";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface UserListProps {
  users: UserWithRole[];
  currentUserId: string;
  isOwner: boolean;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
] as const;

export function UserList({ users, currentUserId, isOwner }: UserListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: string) {
    setError(null);
    setPendingId(userId);
    try {
      const result = await updateUserRole({ userId, role });
      if (!result.ok) {
        setError(result.error ?? null);
      } else {
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{es.noUsers}</p>
      </Card>
    );
  }

  return (
    <section aria-label={es.usersTab} className="flex flex-col gap-2">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <li key={user.id}>
            <Card className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  {user.linkedPersonName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {es.linkedPerson}: {user.linkedPersonName}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
              {isOwner && user.id !== currentUserId && (
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{es.role}</span>
                  <select
                    value={user.role}
                    disabled={pendingId === user.id}
                    onChange={(event) => void handleRoleChange(user.id, event.target.value)}
                    className="h-10 rounded-lg bg-secondary px-2 text-sm outline-none disabled:opacity-50"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
