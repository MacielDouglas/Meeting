"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { redeemJoinToken } from "@/features/organization/application/organization-actions";
import type { PendingJoinTokenItem } from "@/features/organization/application/organization-queries";
import {
  AdmitPersonForm,
  type AdmitPersonSubmit,
} from "@/features/organization/presentation/AdmitPersonForm-client";
import type { PersonOption } from "@/features/people/application/queries";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface JoinTokenSectionProps {
  initial: PendingJoinTokenItem[];
  persons: PersonOption[];
}

export function JoinTokenSection({ initial, persons }: JoinTokenSectionProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleAdmit(row: PendingJoinTokenItem, input: AdmitPersonSubmit) {
    return redeemJoinToken({ code: row.code, ...input });
  }

  function handleAdmitted(
    row: PendingJoinTokenItem,
    userName: string | undefined,
    role: "admin" | "member",
  ) {
    const roleLabel = role === "admin" ? es.roleAdmin : es.roleMember;
    setNotice(`${userName ?? row.userEmail} ${es.admitidoComo} ${roleLabel}.`);
    setExpandedId(null);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.tokensEntrada}</CardTitle>
      <CardDescription>{es.tokensEntradaDesc}</CardDescription>
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground">{es.sinTokens}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initial.map((row) => {
            const expanded = expandedId === row.id;
            return (
              <li key={row.id} className="flex flex-col gap-2 rounded-xl bg-secondary px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.userEmail}</p>
                  </div>
                  <Badge variant="secondary">{row.expiresAt.slice(0, 10)}</Badge>
                </div>
                <p className="font-mono text-lg font-semibold tracking-[0.2em] tabular-nums">
                  {row.code}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                  >
                    {es.admitir}
                  </Button>
                </div>
                {expanded && (
                  <AdmitPersonForm
                    idPrefix={`tok-${row.id}`}
                    persons={persons}
                    fullCreateHref={`/administracion/personas/nueva?userId=${row.userId}`}
                    onSubmit={(input) => handleAdmit(row, input)}
                    onAdmitted={(userName, role) => handleAdmitted(row, userName, role)}
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
