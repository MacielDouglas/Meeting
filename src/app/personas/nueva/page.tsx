import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaArrowLeft, FaCheck } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { listEnabledDesignationFlags } from "@/features/cleaning/application/queries";
import { listPersonOptions, listUserOptions } from "@/features/people/application/queries";
import { PersonForm } from "@/features/people/presentation/PersonForm";
import { FormSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export default async function NewPersonPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "owner" && user.role !== "admin") redirect("/personas");

  const [familyOptions, userOptions, enabledFlags] = await Promise.all([
    listPersonOptions(),
    listUserOptions(),
    listEnabledDesignationFlags(),
  ]);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/personas" aria-label={es.cancel} className="rounded-lg p-2">
          <FaArrowLeft aria-hidden />
        </Link>
        <h1 className="flex-1 text-xl font-bold tracking-tight">{es.newPerson}</h1>
        <button type="submit" form="person-form" aria-label={es.save} className="rounded-lg p-2">
          <FaCheck aria-hidden size={20} />
        </button>
      </header>
      <Suspense fallback={<FormSkeleton fields={6} />}>
        <PersonForm
          mode="create"
          familyOptions={familyOptions}
          userOptions={userOptions}
          enabledDesignationFlags={enabledFlags}
        />
      </Suspense>
    </main>
  );
}
