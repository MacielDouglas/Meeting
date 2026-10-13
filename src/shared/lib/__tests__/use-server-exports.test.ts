import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(testDir, "..", "..", "..");

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".d.ts")
    ) {
      files.push(full);
    }
  }
  return files;
}

/**
 * O Next só aceita funções async como exports de arquivos "use server"
 * (qualquer valor — const, função síncrona, re-export — derruba o módulo
 * inteiro de actions da rota com 500 em produção; vide
 * https://nextjs.org/docs/messages/invalid-use-server-value).
 * Interfaces e `type` são apagados na compilação e estão liberados.
 */
function findValueExports(source: string): string[] {
  const problems: string[] = [];
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const trimmed = (lines[index] ?? "").trim();
    if (/^export (const|let|var|class|enum)/.test(trimmed)) {
      problems.push(`linha ${index + 1}: ${trimmed}`);
      continue;
    }
    if (/^export default/.test(trimmed) && !/^export default async function/.test(trimmed)) {
      problems.push(`linha ${index + 1}: ${trimmed}`);
      continue;
    }
    if (/^export function /.test(trimmed)) {
      problems.push(`linha ${index + 1}: ${trimmed}`);
      continue;
    }
    if (/^export \{/.test(trimmed)) {
      // Re-export em bloco: junta até o `}` e só aceita nomes `type X`.
      let block = trimmed;
      let cursor = index;
      while (!block.includes("}") && cursor + 1 < lines.length) {
        cursor += 1;
        block += ` ${(lines[cursor] ?? "").trim()}`;
      }
      const names = block
        .replace(/^export \{/, "")
        .replace(/\};?$/, "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      if (names.some((name) => !name.startsWith("type "))) {
        problems.push(`linha ${index + 1}: ${trimmed}`);
      }
    }
  }
  return problems;
}

describe("módulos 'use server' só exportam funções async", () => {
  it("nenhum export de valor (const, sync, default, re-export)", () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(srcDir)) {
      const source = readFileSync(file, "utf8");
      if (!source.startsWith('"use server";')) continue;
      for (const problem of findValueExports(source)) {
        offenders.push(`${file} → ${problem}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
