import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaBookOpen, FaListOl } from "react-icons/fa";
import { GiBroom } from "react-icons/gi";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getMyJoinToken,
  isUserAssociated,
} from "@/features/organization/application/organization-queries";
import { MyEntryCode } from "@/features/organization/presentation/MyEntryCode-client";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton } from "@/shared/components/skeletons";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.bienvenida };

async function EntryCodeLoader() {
  const token = await getMyJoinToken();
  return <MyEntryCode initial={token} />;
}

const STEPS = [
  { id: "codigo", title: es.pasoCodigo, description: es.pasoCodigoDesc },
  { id: "owner", title: es.pasoOwner, description: es.pasoOwnerDesc },
  { id: "programa", title: es.pasoPrograma, description: es.pasoProgramaDesc },
] as const;

/** Conteúdo ilustrativo com dados fictícios para o visitante conhecer o app. */
function WelcomeShowcase() {
  return (
    <section aria-label={`${es.vistaPrevia} (${es.ejemplo})`} className="section-stack">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">{es.vistaPrevia}</h2>
        <Badge variant="secondary">{es.ejemplo}</Badge>
      </div>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-secondary px-2.5 py-1 font-display text-xs font-semibold">
            {es.entreSemana}
          </span>
          <span className="text-sm text-muted-foreground">19:30 · Salón del Reino</span>
        </div>
        <ul className="flex flex-col">
          <li className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
            <span title="Tesoros de la Biblia (10 min)" className="min-w-0 truncate font-medium">
              Tesoros de la Biblia (10 min)
            </span>
            <span className="shrink-0 text-muted-foreground">Hno. Ejemplo</span>
          </li>
          <li className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
            <span title="Seamos mejores maestros (4 min)" className="min-w-0 truncate font-medium">
              Seamos mejores maestros (4 min)
            </span>
            <span className="shrink-0 text-muted-foreground">Hna. Ejemplo</span>
          </li>
        </ul>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GiBroom aria-hidden size={18} className="shrink-0" />
          {es.miLimpieza}: Auditorio
        </p>
      </Card>
      <div className="tight-stack">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <FaBookOpen aria-hidden size={18} className="shrink-0 text-muted-foreground" />
          <span className="font-display text-base font-medium">{es.verProgramaCompleto}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <FaListOl aria-hidden size={18} className="shrink-0 text-muted-foreground" />
          <span className="font-display text-sm font-medium">{es.verDiseniosLimpieza}</span>
        </div>
      </div>
    </section>
  );
}

export default async function BienvenidaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  // Associado (admitido) não precisa das boas-vindas: vai ao programa.
  if (await isUserAssociated(user)) redirect("/");

  return (
    <main className="page-stack">
      <PageHeader title={es.bienvenida} description={es.bienvenidaDesc} />
      <Suspense fallback={<CardSkeleton />}>
        <EntryCodeLoader />
      </Suspense>
      <section aria-label={es.comoFunciona} className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">{es.comoFunciona}</h2>
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <li
              key={step.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm font-semibold"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-semibold">{step.title}</span>
                <span className="block text-sm text-muted-foreground">{step.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <WelcomeShowcase />
    </main>
  );
}
