export const USER_ROLES = ["owner", "admin", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: UserRole;
}

export function isPrivilegedRole(role: UserRole): boolean {
  return role === "owner" || role === "admin";
}

export function parseUserRole(value: unknown): UserRole {
  return value === "owner" || value === "admin" ? value : "member";
}
