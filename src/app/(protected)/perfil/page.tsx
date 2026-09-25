import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FaCircleUser } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { LeaveOrganizationSection } from "@/features/organization/presentation/LeaveOrganizationSection-client";
import { getPersonByUserId } from "@/features/people/application/queries";
import { MyPersonNameForm } from "@/features/people/presentation/MyPersonNameForm-client";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";
import { roleLabel } from "@/shared/lib/role-label";

export const metadata: Metadata = { title: es.perfil };

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const person = await getPersonByUserId(user.id);

  return (
    <main className="page-stack">
      <PageHeader title={es.perfil} />

      <Card className="flex flex-col gap-2">
        <CardTitle>{es.misDatos}</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p title={user.name} className="truncate text-sm font-medium">
              {user.name}
            </p>
            <p title={user.email} className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Badge variant="secondary">{roleLabel(user.role)}</Badge>
        </div>
      </Card>

      {person ? (
        <MyPersonNameForm initialFirstName={person.firstName} initialLastName={person.lastName} />
      ) : (
        <EmptyState
          icon={<FaCircleUser aria-hidden size={22} />}
          title={es.usuarioNoVinculado}
          description={es.pideAdminVinculo}
        />
      )}

      {user.role !== "owner" && <LeaveOrganizationSection />}
    </main>
  );
}
