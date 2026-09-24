import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listPersons, listUsersWithRoles } from "@/features/people/application/queries";
import { PersonasTabs } from "@/features/people/presentation/PersonasTabs-client";
import { PageHeader } from "@/shared/components/PageHeader";
import { TabNavSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.people };

interface PeoplePageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/");

  const { tab } = await searchParams;
  const activeTab = tab === "usuarios" ? "usuarios" : "personas";
  const canCreate = user?.role === "owner" || user?.role === "admin";
  const [persons, users] = await Promise.all([
    activeTab === "personas" ? listPersons() : Promise.resolve([]),
    activeTab === "usuarios" ? listUsersWithRoles() : Promise.resolve([]),
  ]);

  return (
    <main className="page-stack">
      <PageHeader title={es.people} />

      <Suspense fallback={<TabNavSkeleton tabs={2} />}>
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
