import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import {
  getContentCounts,
  listOutlines,
  listSongs,
} from "@/features/meeting-content/application/queries";
import { listWatchtowerIssues } from "@/features/meeting-content/application/watchtower-queries";
import { listWorkbookIssues } from "@/features/meeting-content/application/workbook-queries";
import { ContentSection } from "@/features/meeting-content/presentation/ContentSection";
import { PageHeader } from "@/shared/components/PageHeader";
import { TableSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.contenidoReuniones };

async function ContenidoTab() {
  const [songs, outlines, counts, issues, workbooks] = await Promise.all([
    listSongs(),
    listOutlines(),
    getContentCounts(),
    listWatchtowerIssues(),
    listWorkbookIssues(),
  ]);

  return (
    <ContentSection
      initialSongs={songs}
      initialOutlines={outlines}
      initialIssues={issues}
      initialWorkbooks={workbooks}
      counts={counts}
      canManage
    />
  );
}

export default async function ContenidoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/");

  return (
    <main className="page-stack">
      <PageHeader title={es.contenidoReuniones} />

      <Suspense fallback={<TableSkeleton rows={8} />}>
        <ContenidoTab />
      </Suspense>
    </main>
  );
}
