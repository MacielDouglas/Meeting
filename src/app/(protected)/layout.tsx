import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/application/session";

/**
 * Rota protegida: sem sessão, volta ao login. As páginas filhas tratam só
 * de papéis (owner/admin) — o guard de autenticação mora aqui.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return <>{children}</>;
}
