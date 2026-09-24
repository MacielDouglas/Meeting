import { describe, expect, it } from "vitest";
import { isPrivilegedRole, parseUserRole, USER_ROLES } from "@/features/auth/domain/user";

describe("USER_ROLES", () => {
  it("lista os papéis válidos na ordem owner, admin, member", () => {
    expect(USER_ROLES).toEqual(["owner", "admin", "member"]);
  });
});

describe("parseUserRole", () => {
  it("mantém os papéis válidos", () => {
    expect(parseUserRole("owner")).toBe("owner");
    expect(parseUserRole("admin")).toBe("admin");
    expect(parseUserRole("member")).toBe("member");
  });

  it("cai para member quando o valor não é reconhecido", () => {
    expect(parseUserRole("lixo")).toBe("member");
    expect(parseUserRole("Owner")).toBe("member");
    expect(parseUserRole(undefined)).toBe("member");
    expect(parseUserRole(null)).toBe("member");
    expect(parseUserRole(1)).toBe("member");
    expect(parseUserRole({})).toBe("member");
  });
});

describe("isPrivilegedRole", () => {
  it("marca owner e admin como privilegiados", () => {
    expect(isPrivilegedRole("owner")).toBe(true);
    expect(isPrivilegedRole("admin")).toBe(true);
  });

  it("não privilegia member", () => {
    expect(isPrivilegedRole("member")).toBe(false);
  });
});
