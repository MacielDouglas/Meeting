import { es } from "@/shared/i18n/es";

/** Rótulo localizado do papel (o valor cru `owner|admin|member` nunca aparece na UI). */
export function roleLabel(role: "owner" | "admin" | "member"): string {
  if (role === "owner") return es.roleOwner;
  if (role === "admin") return es.roleAdmin;
  return es.roleMember;
}
