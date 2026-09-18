import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { type AuthUser, parseUserRole, type UserRole } from "@/features/auth/domain/user";
import { auth } from "@/features/auth/infrastructure/better-auth";
import { users } from "@/features/auth/infrastructure/user-schema";
import { getDb } from "@/shared/lib/db";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readSessionWithRetry(): Promise<Awaited<
  ReturnType<typeof auth.api.getSession>
> | null> {
  // O Neon pode falhar de forma transitória (rede); tenta até 3x antes de desistir.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await auth.api.getSession({ headers: await headers() });
    } catch (error) {
      lastError = error;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastError;
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const session = await readSessionWithRetry();
    if (!session?.user) return null;

    const rows = await getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const role: UserRole = parseUserRole(row.role);
    return { id: row.id, email: row.email, name: row.name, image: row.image, role };
  } catch {
    // Banco inacessível ou sessão inválida: trata como deslogado em vez de quebrar a página.
    return null;
  }
});

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requirePrivilegedUser(): Promise<AuthUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== "owner" && user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function requireOwnerUser(): Promise<AuthUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== "owner") throw new Error("FORBIDDEN");
  return user;
}
