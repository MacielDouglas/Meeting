import { describe, expect, it } from "vitest";
import {
  createInvitationSchema,
  redeemInvitationSchema,
  redeemJoinTokenSchema,
  renameOrganizationSchema,
} from "@/features/organization/application/organization-validation";

describe("organization-validation", () => {
  it("aceita nomes de até 120 caracteres sem HTML", () => {
    expect(renameOrganizationSchema.safeParse({ name: "Cong. Norte" }).success).toBe(true);
    expect(renameOrganizationSchema.safeParse({ name: "" }).success).toBe(false);
    expect(renameOrganizationSchema.safeParse({ name: "A <b>B</b>" }).success).toBe(false);
  });

  it("normaliza o e-mail do convite e só aceita admin/member", () => {
    const parsed = createInvitationSchema.safeParse({ email: "  Ana@Example.com ", role: "admin" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("ana@example.com");
    expect(
      createInvitationSchema.safeParse({ email: "ana@example.com", role: "owner" }).success,
    ).toBe(false);
    expect(
      createInvitationSchema.safeParse({ email: "no-es-correo", role: "member" }).success,
    ).toBe(false);
  });

  it("só aceita resgate com código XXX-XXX-XXX e papel concedível", () => {
    expect(
      redeemJoinTokenSchema.safeParse({ code: "abc-def-ghj", role: "member", personId: "p1" })
        .success,
    ).toBe(true);
    expect(
      redeemJoinTokenSchema.safeParse({ code: "curto", role: "member", personId: "p1" }).success,
    ).toBe(false);
    expect(
      redeemJoinTokenSchema.safeParse({ code: "abc-def-ghj", role: "owner", personId: "p1" })
        .success,
    ).toBe(false);
  });

  it("admissão exige exatamente um vínculo de pessoa", () => {
    const basic = { firstName: "Ana", lastName: "Paz", sex: "female", young: false };
    expect(redeemInvitationSchema.safeParse({ id: "inv1", personId: "p1" }).success).toBe(true);
    expect(redeemInvitationSchema.safeParse({ id: "inv1", newPerson: basic }).success).toBe(true);
    expect(redeemInvitationSchema.safeParse({ id: "inv1" }).success).toBe(false);
    expect(
      redeemInvitationSchema.safeParse({ id: "inv1", personId: "p1", newPerson: basic }).success,
    ).toBe(false);
    expect(redeemJoinTokenSchema.safeParse({ code: "abc-def-ghj", role: "member" }).success).toBe(
      false,
    );
    expect(
      redeemJoinTokenSchema.safeParse({
        code: "abc-def-ghj",
        role: "member",
        newPerson: { ...basic, sex: "other" },
      }).success,
    ).toBe(false);
  });
});
