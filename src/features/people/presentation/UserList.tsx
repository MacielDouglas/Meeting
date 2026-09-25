"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { removeUserFromOrganization } from "@/features/organization/application/organization-actions";
import { linkUserToPerson, updateUserRole } from "@/features/people/application/actions";
import type { PersonOption, UserWithRole } from "@/features/people/application/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { roleLabel } from "@/shared/lib/role-label";

interface UserListProps {
  users: UserWithRole[];
  currentUserId: string;
  isOwner: boolean;
  joinTokenByUserId?: Record<string, { code: string; expiresAt: string }>;
  unlinkedPersons?: PersonOption[];
}

const ROLE_OPTIONS = [
  { value: "admin", label: es.roleAdmin },
  { value: "member", label: es.roleMember },
] as const;

function LinkPersonForm({
  userId,
  persons,
  disabled,
  onDone,
}: {
  userId: string;
  persons: PersonOption[];
  disabled: boolean;
  onDone: (error: string | null) => void;
}) {
  const [personId, setPersonId] = useState(persons[0]?.id ?? "");
  const [linking, setLinking] = useState(false);

  async function handleLink() {
    if (personId.trim() === "" || linking) return;
    setLinking(true);
    try {
      const result = await linkUserToPerson({ userId, personId });
      onDone(result.ok ? null : (result.error ?? null));
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{es.vincularPersona}</span>
      <span className="flex min-w-0 items-center gap-2">
        <select
          aria-label={es.vincularPersona}
          value={personId}
          disabled={disabled || linking}
          onChange={(event) => setPersonId(event.target.value)}
          className="h-10 min-w-0 rounded-lg bg-secondary px-2 text-sm outline-none focus:border focus:border-ring disabled:opacity-50"
        >
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || linking || personId.trim() === ""}
          onClick={() => void handleLink()}
          className="h-10 shrink-0 rounded-lg bg-secondary px-3 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {es.vincular}
        </button>
      </span>
    </div>
  );
}

export function UserList({
  users,
  currentUserId,
  isOwner,
  joinTokenByUserId = {},
  unlinkedPersons = [],
}: UserListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<UserWithRole | null>(null);
  const [removingPending, setRemovingPending] = useState(false);
  const [removingError, setRemovingError] = useState<string | null>(null);

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

  async function handleRemove() {
    if (!removing) return;
    setRemovingError(null);
    setRemovingPending(true);
    try {
      const result = await removeUserFromOrganization({ id: removing.id });
      if (!result.ok) {
        setRemovingError(result.error ?? null);
      } else {
        setRemoving(null);
        router.refresh();
      }
    } finally {
      setRemovingPending(false);
    }
  }

  function handleLinkedResult(error: string | null) {
    if (error) {
      setError(error);
    } else {
      router.refresh();
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
        {users.map((user) => {
          const joinToken = joinTokenByUserId[user.id];
          return (
            <li key={user.id}>
              <Card className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p title={user.name} className="truncate text-sm font-medium">
                      {user.name}
                    </p>
                    <p title={user.email} className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    {user.linkedPersonName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {es.linkedPerson}: {user.linkedPersonName}
                      </p>
                    )}
                    {isOwner && joinToken && (
                      <p className="font-mono text-xs break-all tabular-nums text-muted-foreground">
                        {`${es.codigoEntrada}: ${joinToken.code} · ${es.codigoExpira}: ${new Date(joinToken.expiresAt).toLocaleDateString("es-ES")}`}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{roleLabel(user.role)}</Badge>
                </div>
                {isOwner && user.id !== currentUserId && user.role !== "owner" && (
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{es.role}</span>
                    <select
                      value={user.role}
                      disabled={pendingId === user.id}
                      onChange={(event) => void handleRoleChange(user.id, event.target.value)}
                      className="h-10 rounded-lg bg-secondary px-2 text-sm outline-none focus:border focus:border-ring disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {isOwner &&
                  !user.linkedPersonName &&
                  (unlinkedPersons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{es.sinPersonasLibres}</p>
                  ) : (
                    <LinkPersonForm
                      userId={user.id}
                      persons={unlinkedPersons}
                      disabled={pendingId === user.id}
                      onDone={handleLinkedResult}
                    />
                  ))}
                {isOwner && user.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => setRemoving(user)}
                    aria-label={es.excluirUsuario}
                    className="flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-danger transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                  >
                    <FaTrash aria-hidden size={14} />
                    {es.excluir}
                  </button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !removingPending) {
            setRemoving(null);
            setRemovingError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{es.excluirUsuario}</AlertDialogTitle>
            <AlertDialogDescription>{es.confirmRemoverUsuario}</AlertDialogDescription>
          </AlertDialogHeader>
          {removing && (
            <p className="truncate text-sm font-medium">
              {removing.name} · {removing.email}
            </p>
          )}
          {removingError && (
            <p role="alert" className="text-sm text-danger">
              {removingError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingPending}>{es.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={removingPending}
              onClick={(event) => {
                event.preventDefault();
                void handleRemove();
              }}
            >
              {es.excluir}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
