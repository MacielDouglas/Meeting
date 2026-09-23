import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listPersons, listUsersWithRoles } from "@/features/people/application/queries";
import { PersonasTabs } from "@/features/people/presentation/PersonasTabs-client";
import { PageHeader } from "@/shared/components/PageHeader";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

interface PeoplePageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { tab } = await searchParams;
  const activeTab = tab === "usuarios" ? "usuarios" : "personas";
  const canCreate = user?.role === "owner" || user?.role === "admin";
  const [persons, users] = await Promise.all([
    activeTab === "personas" ? listPersons() : Promise.resolve([]),
    activeTab === "usuarios" ? listUsersWithRoles() : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title={es.people} />

      <Suspense
        fallback={
          <div className="flex gap-1 rounded-xl bg-secondary p-1" aria-hidden>
            <div className="h-8 flex-1 animate-pulse rounded-lg bg-background" />
            <div className="h-8 flex-1 animate-pulse rounded-lg bg-background" />
          </div>
        }
      >
        <TabNav
          param="tab"
          defaultValue="personas"
          ariaLabel={es.people}
          items={[
            { value: "personas", label: es.peopleTab, href: "/personas" },
            { value: "usuarios", label: es.usersTab, href: "/personas?tab=usuarios" },
          ]}
        />
      </Suspense>

      <PersonasTabs
        tab={activeTab}
        persons={persons}
        users={users}
        canCreate={canCreate}
        currentUserId={user?.id ?? ""}
        isOwner={user?.role === "owner"}
      />
    </main>
  );
}
