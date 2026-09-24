import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FaArrowLeft, FaCheck } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { listEnabledDesignationFlags } from "@/features/cleaning/application/queries";
import type { PersonFormValues } from "@/features/people/application/person-validation";
import {
  getPerson,
  listPersonOptions,
  listUserOptions,
} from "@/features/people/application/queries";
import { getFullName } from "@/features/people/domain/person";
import { DeletePersonButton } from "@/features/people/presentation/DeletePersonButton";
import { PersonForm } from "@/features/people/presentation/PersonForm";
import { PageHeader } from "@/shared/components/PageHeader";
import { FormSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export const metadata: Metadata = { title: es.editPerson };

interface EditPersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPersonPage({ params }: EditPersonPageProps) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "admin") redirect("/personas");

  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const [familyOptions, userOptions, enabledFlags] = await Promise.all([
    listPersonOptions(person.id),
    listUserOptions(person.id),
    listEnabledDesignationFlags(),
  ]);

  const initial: PersonFormValues = {
    firstName: person.firstName,
    lastName: person.lastName,
    sex: person.sex,
    familyHead: person.familyHead,
    familyMemberId: person.familyMemberId,
    userId: person.userId,
    cleaning: person.cleaning,
    young: person.young ?? false,
    helper: person.helper,
    startConversations: person.startConversations,
    returnVisits: person.returnVisits,
    makeDisciples: person.makeDisciples,
    explainBeliefs: person.explainBeliefs,
    betterSpeech: person.betterSpeech,
    bibleReading: person.bibleReading,
    baptized: person.baptized,
    prayer: person.prayer,
    sound: person.sound,
    video: person.video,
    platform: person.platform,
    microphone: person.microphone,
    elder: person.elder,
    ministerialServant: person.ministerialServant,
    midweekChairman: person.midweekChairman,
    treasuresTalk: person.treasuresTalk,
    pearlsQuest: person.pearlsQuest,
    audienceAnalysis: person.audienceAnalysis,
    analysisTalk: person.analysisTalk,
    bibleStudy: person.bibleStudy,
    studyReader: person.studyReader,
    publicChairman: person.publicChairman,
    publicTalk: person.publicTalk,
    watchtowerConductor: person.watchtowerConductor,
    watchtowerReader: person.watchtowerReader,
    usher: person.usher,
    unavailable: person.unavailable ?? false,
    unavailableNotes: person.unavailableNotes ?? "",
  };

  return (
    <main className="page-stack">
      <PageHeader
        title={getFullName(person)}
        actions={
          <>
            <Link
              href="/personas"
              aria-label={es.cancel}
              className="grid h-11 w-11 place-items-center rounded-xl border border-input bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <FaArrowLeft aria-hidden />
            </Link>
            <DeletePersonButton personId={person.id} className="w-auto" />
            <button
              type="submit"
              form="person-form"
              aria-label={es.save}
              className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <FaCheck aria-hidden size={20} />
            </button>
          </>
        }
      />
      <Suspense fallback={<FormSkeleton fields={6} />}>
        <PersonForm
          mode="edit"
          personId={person.id}
          initial={initial}
          familyOptions={familyOptions}
          userOptions={userOptions}
          enabledDesignationFlags={enabledFlags}
        />
      </Suspense>
    </main>
  );
}
