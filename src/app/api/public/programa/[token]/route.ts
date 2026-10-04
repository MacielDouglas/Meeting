import { hashShareToken, isShareTokenFormat } from "@/features/sharing/domain/share-token";
import { encryptSharePayload } from "@/features/sharing/domain/share-crypto";
import { buildPublicWeekPayload } from "@/features/sharing/application/share-payload";
import { findShareOrganizationIdByHash } from "@/features/sharing/application/share-queries";
import {
  clientIpFromHeaders,
  isPublicShareRateLimited,
} from "@/features/sharing/application/share-rate-limit";

function notFound(): Response {
  // Resposta uniforme (formato inválido ou token desconhecido): não revela o motivo.
  return Response.json({ error: "Not found." }, { status: 404 });
}

/**
 * Enlace público da semana, criptografado de ponta a ponta.
 * GET /api/public/programa/[token] (token alfanumérico de 32 caracteres).
 *
 * O token é o segredo compartilhado: a chave AES-256-GCM é SHA-256(token) e
 * o corpo é sempre um envelope novo `{ v, alg, iv, tag, data }` (base64).
 * Sem o token, o corpo é opaco — nem o transporte nem caches veem o programa.
 * Sem validade: enquanto o owner não revogar. Revogado → 404.
 * Rate limit (60 req/min por IP): trava adivinhação online.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  if (isPublicShareRateLimited(clientIpFromHeaders(_request.headers))) {
    return Response.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  if (!isShareTokenFormat(token)) return notFound();

  let organizationId: string | null;
  try {
    organizationId = await findShareOrganizationIdByHash(hashShareToken(token));
  } catch {
    return Response.json({ error: "No se pudo cargar el programa." }, { status: 500 });
  }
  if (!organizationId) return notFound();

  let plaintext: string;
  try {
    const payload = await buildPublicWeekPayload();
    plaintext = JSON.stringify(payload);
  } catch {
    return Response.json({ error: "No se pudo cargar el programa." }, { status: 500 });
  }

  const envelope = encryptSharePayload(token, plaintext);
  return Response.json(envelope, {
    headers: {
      // Corpo opaco e com IV novo a cada acesso: nunca armazenar em cache.
      "Cache-Control": "private, no-store, must-revalidate",
    },
  });
}
