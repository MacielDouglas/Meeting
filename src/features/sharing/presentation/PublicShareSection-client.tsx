"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaLink } from "react-icons/fa6";
import {
  createPublicShareToken,
  revokePublicShareToken,
} from "@/features/sharing/application/share-actions";
import type { PublicShareStatus } from "@/features/sharing/application/share-queries";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface PublicShareSectionProps {
  initial: PublicShareStatus;
}

interface CreatedShare {
  token: string;
  url: string;
}

const DECRYPT_EXAMPLE = `import { createDecipheriv, createHash } from "node:crypto";

const res = await fetch(process.env.SHARE_URL);
const { iv, tag, data } = await res.json();
const key = createHash("sha256").update(process.env.SHARE_TOKEN).digest();
const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
d.setAuthTag(Buffer.from(tag, "base64"));
const week = JSON.parse(
  Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8"),
);
console.log(week.weekStart, week.midweek, week.weekend);`;

export function PublicShareSection({ initial }: PublicShareSectionProps) {
  const router = useRouter();
  const [active, setActive] = useState(initial.active);
  const [createdAt, setCreatedAt] = useState(initial.createdAt);
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(es.copiado);
    } catch {
      setError(es.errorCargarLista);
    }
  }

  async function handleCreate() {
    if (active && !window.confirm(es.confirmarRotarEnlace)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await createPublicShareToken();
    setBusy(false);
    if (!result.ok || !result.token || !result.url) {
      setError(result.error ?? es.errorGuardar);
      return;
    }
    setCreated({ token: result.token, url: result.url });
    setActive(true);
    setCreatedAt(new Date().toISOString());
    router.refresh();
  }

  async function handleRevoke() {
    if (!window.confirm(es.confirmarRevocarEnlace)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await revokePublicShareToken();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? es.errorExcluir);
      return;
    }
    setCreated(null);
    setActive(false);
    setCreatedAt(null);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.enlacePublico}</CardTitle>
      <CardDescription>{es.enlacePublicoDesc}</CardDescription>
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {created ? (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{es.enlaceAvisoUnico}</p>
          <p className="break-all font-mono text-base font-semibold tracking-widest tabular-nums">
            {created.token}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">{created.url}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copyText(created.token)}
            >
              {es.copiarToken}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copyText(created.url)}
            >
              {es.copiarEnlace}
            </Button>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">{es.comoDescifrar}</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed">
              {DECRYPT_EXAMPLE}
            </pre>
          </details>
        </div>
      ) : active ? (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <p className="text-sm">
            {es.enlaceActivoDesde}{" "}
            {createdAt ? new Date(createdAt).toLocaleDateString("es-ES") : "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? es.guardando : es.rotarEnlace}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRevoke}
              disabled={busy}
            >
              {es.revocarEnlace}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FaLink aria-hidden size={16} />
            {es.enlaceInactivo}
          </p>
          <div>
            <Button type="button" size="sm" onClick={handleCreate} disabled={busy}>
              {busy ? es.guardando : es.generarEnlace}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
