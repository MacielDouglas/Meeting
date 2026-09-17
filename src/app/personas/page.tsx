import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/application/session";
import { listPersons, listUsersWithRoles } from "@/features/people/application/queries";
import { PersonList } from "@/features/people/presentation/PersonList";
import { UserList } from "@/features/people/presentation/UserList";
import { es } from "@/shared/i18n/es";
import { cn } from "@/shared/lib/utils";

interface PeoplePageProps {
  searchParams: Promise<{ tab?: string }>;
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

      <nav aria-label={es.people} className="flex gap-1 rounded-xl bg-secondary p-1">
        <Link
          href="/personas"
          aria-current={activeTab === "personas" ? "page" : undefined}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium",
            activeTab === "personas" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          {es.peopleTab}
        </Link>
        <Link
          href="/personas?tab=usuarios"
          aria-current={activeTab === "usuarios" ? "page" : undefined}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium",
            activeTab === "usuarios" ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          {es.usersTab}
        </Link>
      </nav>

      {activeTab === "personas" ? (
        <PersonList persons={await listPersons()} canCreate={canCreate} />
      ) : (
        <UserList
          users={await listUsersWithRoles()}
          currentUserId={user.id}
          isOwner={user.role === "owner"}
        />
      )}
    </main>
  );
}
