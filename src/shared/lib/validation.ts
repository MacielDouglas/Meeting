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

/**
 * Escapa curingas de LIKE (`%`, `_`, `\`) com a barra invertida (escape padrão
 * do Postgres em padrões LIKE). Evita que a digitação vire curinga; o Drizzle
 * continua ligando o valor como parâmetro (sem SQLi).
 */
export function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Monta `%termo%` já com curingas escapados para `ilike`. */
export function likeContains(search: string): string {
  return `%${escapeLikeWildcards(search)}%`;
}
