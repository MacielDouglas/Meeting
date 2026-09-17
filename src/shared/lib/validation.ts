import { z } from "zod";
import { containsHtml } from "@/shared/lib/sanitize";

export function plainText(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !containsHtml(value), { message: "HTML no permitido" });
}

export function optionalPlainText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((value) => !containsHtml(value), { message: "HTML no permitido" })
    .optional()
    .nullable();
}
