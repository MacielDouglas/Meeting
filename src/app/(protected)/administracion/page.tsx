import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaGear, FaUserGroup, FaUsersGear } from "react-icons/fa6";
import { getActiveOrganization } from "@/features/auth/application/organization";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  listInvitations,
  listPendingJoinTokens,
} from "@/features/organization/application/organization-queries";
import { InvitationSection } from "@/features/organization/presentation/InvitationSection-client";
import { JoinTokenSection } from "@/features/organization/presentation/JoinTokenSection-client";
import { RenameOrganizationForm } from "@/features/organization/presentation/RenameOrganizationForm-client";
import {
  listPersons,
  listUnlinkedPersonOptions,
  listUserAccounts,
  listUsersWithRoles,
} from "@/features/people/application/queries";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton } from "@/shared/components/skeletons";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.administracion };

async function AdminOverview() {
  const [schedule, users, persons, activeOrg] = await Promise.all([
    getMeetingSchedule(),
    listUsersWithRoles(),
    listPersons(),
    getActiveOrganization(),
  ]);

  const owners = users.filter((item) => item.role === "owner").length;
  const admins = users.filter((item) => item.role === "admin").length;
  const members = users.length - owners - admins;
  const congregationName = schedule.congregationName.trim();

  return (
    <div className="section-stack">
      <Card className="p-4">
        <CardTitle>{es.administracionOrganizacion}</CardTitle>
        <CardDescription>
          {congregationName === "" ? es.sinCongregacion : congregationName}
          {activeOrg ? ` · ${activeOrg.organizationName}` : ""}
        </CardDescription>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-secondary px-3 py-2">
            <dt className="text-xs text-muted-foreground">{es.administracionUsuarios}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{users.length}</dd>
          </div>
          <div className="rounded-xl bg-secondary px-3 py-2">
            <dt className="text-xs text-muted-foreground">{es.administracionPersonas}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{persons.length}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {es.roleOwner}: {owners} · {es.roleAdmin}: {admins} · {es.roleMember}: {members}
        </p>
      </Card>

      <nav aria-label={es.administracion} className="tight-stack sm:grid sm:grid-cols-3">
        <Link
          href="/administracion/personas?tab=usuarios"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaUsersGear aria-hidden size={20} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">
              {es.administracionUsuarios}
            </span>
            <span className="block truncate text-sm text-muted-foreground">{es.usersTab}</span>
          </span>
        </Link>
        <Link
          href="/administracion/personas"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaUserGroup aria-hidden size={20} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">
              {es.administracionPersonas}
            </span>
            <span className="block truncate text-sm text-muted-foreground">{es.peopleTab}</span>
          </span>
        </Link>
        <Link
          href="/administracion/configuracion"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <FaGear aria-hidden size={20} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">
              {es.administracionAjustes}
            </span>
            <span className="block truncate text-sm text-muted-foreground">{es.configuracion}</span>
          </span>
        </Link>
      </nav>
    </div>
  );
}

async function RenameLoader() {
  const schedule = await getMeetingSchedule();
  return <RenameOrganizationForm initialName={schedule.congregationName} />;
}

async function InvitationsLoader() {
  const [invitations, accounts, persons] = await Promise.all([
    listInvitations(),
    listUserAccounts(),
    listUnlinkedPersonOptions(),
  ]);
  const emails = new Set<string>();
  const userIdByEmail: Record<string, string> = {};
  for (const account of accounts) {
    emails.add(account.email.toLowerCase());
    userIdByEmail[account.email.toLowerCase()] = account.id;
  }
  return (
    <InvitationSection
      initial={invitations.map((invitation) => ({
        ...invitation,
        hasAccount: emails.has(invitation.email.toLowerCase()),
      }))}
      persons={persons}
      userIdByEmail={userIdByEmail}
    />
  );
}

async function JoinTokensLoader() {
  const [tokens, persons] = await Promise.all([
    listPendingJoinTokens(),
    listUnlinkedPersonOptions(),
  ]);
  return <JoinTokenSection initial={tokens} persons={persons} />;
}

export default async function AdministracionPage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner") redirect("/");

  return (
    <main className="page-stack">
      <PageHeader title={es.administracion} description={es.administracionDesc} />
      <Suspense fallback={<CardSkeleton />}>
        <AdminOverview />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <RenameLoader />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <InvitationsLoader />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <JoinTokensLoader />
      </Suspense>
    </main>
  );
}
