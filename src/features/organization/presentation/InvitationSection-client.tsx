"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  cancelInvitation,
  createInvitation,
  redeemInvitation,
  resendInvitation,
} from "@/features/organization/application/organization-actions";
import type { InvitationItem } from "@/features/organization/application/organization-queries";
import {
  AdmitPersonForm,
  type AdmitPersonSubmit,
} from "@/features/organization/presentation/AdmitPersonForm-client";
import type { PersonOption } from "@/features/people/application/queries";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { SelectField } from "@/shared/components/ui/input";
import { es } from "@/shared/i18n/es";

export interface InvitationRow extends InvitationItem {
  hasAccount: boolean;
}

interface InvitationSectionProps {
  initial: InvitationRow[];
  persons: PersonOption[];
  userIdByEmail: Record<string, string>;
}

export function InvitationSection({ initial, persons, userIdByEmail }: InvitationSectionProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await createInvitation({ email, role });
      if (result.ok) {
        setEmail("");
        setNotice(es.invitacionCreada);
        router.refresh();
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCancel(id: string) {
    setError(null);
    setNotice(null);
    setPendingId(id);
    try {
      const result = await cancelInvitation({ id });
      if (!result.ok) {
        setError(result.error ?? null);
      } else {
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleAdmit(row: InvitationRow, input: AdmitPersonSubmit) {
    const result = await redeemInvitation({ id: row.id, ...input });
    return result;
  }

  function handleAdmitted(row: InvitationRow, userName: string | undefined) {
    const roleLabel = row.role === "admin" ? es.roleAdmin : es.roleMember;
    setNotice(`${userName ?? row.email} ${es.admitidoComo} ${roleLabel}.`);
    setExpandedId(null);
    router.refresh();
  }

  async function handleResend(row: InvitationRow) {
    setError(null);
    setNotice(null);
    setPendingId(row.id);
    try {
      const result = await resendInvitation({ id: row.id });
      if (!result.ok) {
        setError(result.error ?? null);
      } else {
        setNotice(es.invitacionReenviada);
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.invitaciones}</CardTitle>
      <CardDescription>{es.invitacionesDesc}</CardDescription>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}
      <form onSubmit={(event) => void handleInvite(event)} className="flex flex-col gap-1">
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="shrink-0 text-sm font-medium">{es.invitarCorreo}</span>
          <input
            id="invitation-email"
            type="email"
            value={email}
            required
            maxLength={255}
            placeholder={es.invitarCorreoPlaceholder}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full max-w-55 rounded-lg border border-transparent bg-secondary px-3 text-right text-sm outline-none focus:border-ring"
          />
        </label>
        <SelectField
          id="invitation-role"
          label={es.role}
          value={role}
          onChange={setRole}
          options={[
            { value: "member", label: es.roleMember },
            { value: "admin", label: es.roleAdmin },
          ]}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {es.invitar}
        </Button>
      </form>

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground">{es.sinInvitaciones}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initial.map((row) => {
            const expired = new Date(row.expiresAt) <= new Date();
            const expanded = expandedId === row.id;
            const linkedUserId = userIdByEmail[row.email.toLowerCase()] ?? "";
            return (
              <li key={row.id} className="flex flex-col gap-2 rounded-xl bg-secondary px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.email}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {expired
                        ? es.invitacionVencida
                        : `${es.codigoExpira}: ${row.expiresAt.slice(0, 10)}`}
                    </p>
                  </div>
                  <Badge variant="secondary">{row.role}</Badge>
                </div>
                {!expired && (
                  <p className="text-xs text-muted-foreground">
                    {row.hasAccount ? es.cuentaLista : es.esperandoLogin}
                  </p>
                )}
                <div className="flex gap-2">
                  {expired ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pendingId === row.id}
                      onClick={() => void handleResend(row)}
                    >
                      {es.reenviarInvitacion}
                    </Button>
                  ) : (
                    row.hasAccount && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pendingId === row.id}
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                      >
                        {es.admitir}
                      </Button>
                    )
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === row.id}
                    onClick={() => void handleCancel(row.id)}
                  >
                    {es.cancelarInvitacion}
                  </Button>
                </div>
                {expanded && !expired && row.hasAccount && (
                  <AdmitPersonForm
                    idPrefix={`inv-${row.id}`}
                    persons={persons}
                    fullCreateHref={`/administracion/personas/nueva?userId=${linkedUserId}`}
                    roleFixed={row.role}
                    onSubmit={(input) => handleAdmit(row, input)}
                    onAdmitted={(userName) => handleAdmitted(row, userName)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
