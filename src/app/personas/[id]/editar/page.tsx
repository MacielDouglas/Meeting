import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { es } from "@/shared/i18n/es";

interface EditPersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPersonPage({ params }: EditPersonPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/personas");

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
  };

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/personas" aria-label={es.cancel} className="shrink-0 rounded-lg p-2">
            <FaArrowLeft aria-hidden />
          </Link>
          <h1 className="truncate text-xl font-bold tracking-tight">{getFullName(person)}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DeletePersonButton personId={person.id} />
          <button type="submit" form="person-form" aria-label={es.save} className="rounded-lg p-2">
            <FaCheck aria-hidden size={20} />
          </button>
        </div>
      </header>
      <PersonForm
        mode="edit"
        personId={person.id}
        initial={initial}
        familyOptions={familyOptions}
        userOptions={userOptions}
        enabledDesignationFlags={enabledFlags}
      />
    </main>
  );
}
