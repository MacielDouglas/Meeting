// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PersonCleaningHistory } from "@/features/cleaning/application/cleaning-program-queries";
import { CleaningHistoryBadge } from "@/features/cleaning/presentation/CleaningHistoryBadge";

const history: PersonCleaningHistory[] = [
  { sectorKey: "auditorio", sectorName: "Auditorio", assignmentDate: "2026-01-05" },
  { sectorKey: "banheiros", sectorName: "Baños", assignmentDate: "2026-01-12" },
];

const summary = "Auditorio (2026-01-05), Baños (2026-01-12)";

describe("CleaningHistoryBadge", () => {
  it("retorna nulo quando não há histórico", () => {
    const { container } = render(
      <CleaningHistoryBadge history={[]} currentSectorKey="auditorio" typeKey="weekly" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("expõe o resumo só para leitor de tela", () => {
    const { container } = render(
      <CleaningHistoryBadge history={history} currentSectorKey="auditorio" typeKey="weekly" />,
    );
    const hidden = container.querySelector("span.sr-only");
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveTextContent(summary);
    expect(screen.getByText(summary)).toBeInTheDocument();
  });

  it("marca cada ícone como aria-hidden com tooltip individual", () => {
    const { container } = render(
      <CleaningHistoryBadge history={history} currentSectorKey="auditorio" typeKey="weekly" />,
    );
    const icons = container.querySelectorAll('span[aria-hidden="true"]');
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveAttribute("title", "Auditorio — 2026-01-05");
    expect(icons[1]).toHaveAttribute("title", "Baños — 2026-01-12");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("destaca o setor atual e usa o resumo como title do grupo", () => {
    const { container } = render(
      <CleaningHistoryBadge history={history} currentSectorKey="auditorio" typeKey="weekly" />,
    );
    const icons = container.querySelectorAll('span[aria-hidden="true"]');
    expect(icons[0].className).toContain("text-warning");
    expect(icons[1].className).toContain("text-muted-foreground");
    expect(container.firstChild).toHaveAttribute("title", summary);
  });
});
