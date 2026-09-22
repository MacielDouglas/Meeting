import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FaArrowLeft, FaCheck } from "react-icons/fa6";
import { getCurrentUser } from "@/features/auth/application/session";
import { listEnabledDesignationFlags } from "@/features/cleaning/application/queries";
import { listPersonOptions, listUserOptions } from "@/features/people/application/queries";
import { PersonForm } from "@/features/people/presentation/PersonForm";
import { PageHeader } from "@/shared/components/PageHeader";
import { FormSkeleton } from "@/shared/components/skeletons";
import { es } from "@/shared/i18n/es";

export default async function NewPersonPage() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "admin") redirect("/personas");

  const [familyOptions, userOptions, enabledFlags] = await Promise.all([
    listPersonOptions(),
    listUserOptions(),
    listEnabledDesignationFlags(),
  ]);

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title={es.newPerson}
        actions={
          <>
            <Link
              href="/personas"
              aria-label={es.cancel}
              className="grid h-11 w-11 place-items-center rounded-xl border border-input bg-background text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <FaArrowLeft aria-hidden />
            </Link>
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
          mode="create"
          familyOptions={familyOptions}
          userOptions={userOptions}
          enabledDesignationFlags={enabledFlags}
        />
      </Suspense>
    </main>
  );
}
