import {
  CardSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
  TabNavSkeleton,
} from "@/shared/components/skeletons";

export default function ConfiguracionLoading() {
  return (
    <main className="page-stack" aria-busy="true" aria-label="Cargando configuración">
      <PageHeaderSkeleton lines={1} />
      <TabNavSkeleton tabs={3} />
      <FormSkeleton fields={4} />
      <CardSkeleton />
    </main>
  );
}
