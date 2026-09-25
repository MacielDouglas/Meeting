import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { isUserAssociated } from "@/features/organization/application/organization-queries";

/** Rotas privadas nunca pré-renderizam: sessão só existe em request real. */
export const dynamic = "force-dynamic";

/**
 * Rota protegida: sem sessão, volta ao login; sem associação à organização,
 * vai às boas-vindas (a associação só nasce de convite, código ou papel
 * concedido pelo owner — nunca automática no login). As páginas filhas tratam
 * só de papéis (owner/admin).
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!(await isUserAssociated(user))) redirect("/bienvenida");
  return <>{children}</>;
}
