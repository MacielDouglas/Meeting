import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listPersons, listUsersWithRoles } from "@/features/people/application/queries";
import { PersonList } from "@/features/people/presentation/PersonList";
import { UserList } from "@/features/people/presentation/UserList";
import { TableSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

interface PeoplePageProps {
  searchParams: Promise<{ tab?: string }>;
}

/** Seção server: busca personas e entrega à ilha client `PersonList`. */
async function PersonListSection({ canCreate }: { canCreate: boolean }) {
  const persons = await listPersons();
  return <PersonList persons={persons} canCreate={canCreate} />;
}

/** Seção server: busca usuários e entrega só flags primitivas à ilha client. */
async function UserListSection({
  currentUserId,
  isOwner,
}: {
  currentUserId: string;
  isOwner: boolean;
}) {
  const users = await listUsersWithRoles();
  return <UserList users={users} currentUserId={currentUserId} isOwner={isOwner} />;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { tab } = await searchParams;
  const activeTab = tab === "usuarios" ? "usuarios" : "personas";
  const canCreate = user.role === "owner" || user.role === "admin";

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{es.people}</h1>
      </header>

      <Suspense
        fallback={
          <div className="flex gap-1 rounded-xl bg-secondary p-1" aria-hidden>
            <div className="h-9 flex-1 animate-pulse rounded-lg bg-background" />
            <div className="h-9 flex-1 animate-pulse rounded-lg bg-background" />
          </div>
        }
      >
        <TabNav
          param="tab"
          defaultValue="personas"
          ariaLabel={es.people}
          variant="segmented"
          items={[
            { value: "personas", label: es.peopleTab, href: "/personas" },
            { value: "usuarios", label: es.usersTab, href: "/personas?tab=usuarios" },
          ]}
        />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={8} />}>
        {activeTab === "personas" ? (
          <PersonListSection canCreate={canCreate} />
        ) : (
          <UserListSection currentUserId={user.id} isOwner={user.role === "owner"} />
        )}
      </Suspense>
    </main>
  );
}
