import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type AuthUser, parseUserRole, type UserRole } from "@/features/auth/domain/user";
import { auth } from "@/features/auth/infrastructure/better-auth";
import { users } from "@/features/auth/infrastructure/user-schema";
import { getDb } from "@/shared/lib/db";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
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
}

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
