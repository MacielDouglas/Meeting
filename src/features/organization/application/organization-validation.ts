import { z } from "zod";
import { isJoinTokenCodeFormat } from "@/features/organization/domain/join-token";
import { plainText } from "@/shared/lib/validation";

/** Papéis que o owner pode conceder por convite ou token (owner nunca por essas vias). */
export const grantableRoleSchema = z.enum(["admin", "member"]);

const personIdField = z.string().trim().min(1).max(64);

export const basicPersonSchema = z.object({
  firstName: plainText(80),
  lastName: plainText(80),
  sex: z.enum(["male", "female"]),
  young: z.boolean(),
});

/**
 * Vínculo obrigatório na admissão: ou uma pessoa existente (livre) ou os
 * dados básicos para criar uma nova na hora.
 */
const admitLinkFields = {
  personId: personIdField.optional(),
  newPerson: basicPersonSchema.optional(),
};

function exactlyOnePersonLink(
  value: { personId?: string; newPerson?: unknown },
  ctx: z.RefinementCtx,
) {
  if ((value.personId ? 1 : 0) + (value.newPerson ? 1 : 0) !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Elige una persona existente o crea una nueva para admitir.",
    });
  }
}

export const renameOrganizationSchema = z.object({
  name: plainText(120),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Correo no válido." }).max(255),
  role: grantableRoleSchema,
});

export const invitationIdSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

export const redeemInvitationSchema = z
  .object({ id: personIdField, ...admitLinkFields })
  .superRefine(exactlyOnePersonLink);

export const redeemJoinTokenSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(16)
      .refine((value) => isJoinTokenCodeFormat(value), {
        message: "Código no válido (XXX-XXX-XXX).",
      }),
    role: grantableRoleSchema,
    ...admitLinkFields,
  })
  .superRefine(exactlyOnePersonLink);

export type RenameOrganizationInput = z.infer<typeof renameOrganizationSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type GrantableRole = z.infer<typeof grantableRoleSchema>;
export type BasicPersonInput = z.infer<typeof basicPersonSchema>;
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
export type RedeemJoinTokenInput = z.infer<typeof redeemJoinTokenSchema>;
