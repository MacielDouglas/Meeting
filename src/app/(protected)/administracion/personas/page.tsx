import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { listOutlines } from "@/features/meeting-content/application/queries";
import { listOutsideSpeakers } from "@/features/meetings/application/outside-speaker-queries";
import { OutsideSpeakersClient } from "@/features/meetings/presentation/OutsideSpeakers-client";
import { listActiveJoinTokenCodes } from "@/features/organization/application/organization-queries";
import {
  listPersons,
  listUnlinkedPersonOptions,
  listUsersWithRoles,
} from "@/features/people/application/queries";
import { PersonasTabs } from "@/features/people/presentation/PersonasTabs-client";
import { getMeetingSchedule } from "@/features/settings/application/queries";
import { PageHeader } from "@/shared/components/PageHeader";
import { CardSkeleton, TabNavSkeleton } from "@/shared/components/skeletons";
import { TabNav } from "@/shared/components/TabNav-client";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.people };

interface PeoplePageProps {
  searchParams: Promise<{ tab?: string }>;
}

type PersonasTab = "personas" | "usuarios" | "oradores";

async function OradoresTab() {
  const [speakers, outlines, meetingScheduleData] = await Promise.all([
    listOutsideSpeakers(),
    listOutlines(),
    getMeetingSchedule(),
  ]);

  return (
    <OutsideSpeakersClient
      initialSpeakers={speakers}
      initialOutlines={outlines.map((o) => ({ number: o.number, theme: o.theme }))}
      systemCongregation={meetingScheduleData.congregationName}
      canManage
      requireEditMode={false}
    />
  );
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/");

  const { tab } = await searchParams;
  const activeTab: PersonasTab =
    tab === "usuarios" ? "usuarios" : tab === "oradores" ? "oradores" : "personas";
  const canCreate = user?.role === "owner" || user?.role === "admin";
  const isOwner = user?.role === "owner";
  const [persons, users, activeCodes, unlinkedPersons] = await Promise.all([
    activeTab === "personas" ? listPersons() : Promise.resolve([]),
    activeTab === "usuarios" ? listUsersWithRoles() : Promise.resolve([]),
    // Códigos de entrada: só o owner vê (credencial de uso único).
    activeTab === "usuarios" && isOwner ? listActiveJoinTokenCodes() : Promise.resolve([]),
    // Pessoas livres para vincular: só o owner vincula.
    activeTab === "usuarios" && isOwner ? listUnlinkedPersonOptions() : Promise.resolve([]),
  ]);
  const joinTokenByUserId: Record<string, { code: string; expiresAt: string }> = {};
  for (const item of activeCodes) {
    joinTokenByUserId[item.userId] = { code: item.code, expiresAt: item.expiresAt };
  }

  return (
    <main className="page-stack">
      <PageHeader title={es.people} />

      <Suspense fallback={<TabNavSkeleton tabs={3} />}>
        <TabNav
          param="tab"
          defaultValue="personas"
          ariaLabel={es.people}
          items={[
            { value: "personas", label: es.peopleTab, href: "/administracion/personas" },
            {
              value: "usuarios",
              label: es.usersTab,
              href: "/administracion/personas?tab=usuarios",
            },
            {
              value: "oradores",
              label: es.tabOradores,
              href: "/administracion/personas?tab=oradores",
            },
          ]}
        />
      </Suspense>

      {activeTab === "oradores" ? (
        <Suspense fallback={<CardSkeleton />}>
          <OradoresTab />
        </Suspense>
      ) : (
        <PersonasTabs
          tab={activeTab}
          persons={persons}
          users={users}
          canCreate={canCreate}
          currentUserId={user?.id ?? ""}
          isOwner={isOwner}
          joinTokenByUserId={joinTokenByUserId}
          unlinkedPersons={unlinkedPersons}
        />
      )}
    </main>
  );
}
