export interface AssignableItem {
  countable: boolean;
  assigned: boolean;
}

/** Progresso N/M com a mesma regra para contar e mostrar (vagas vs designadas). */
export function summarizeAssignments(items: AssignableItem[]): {
  assigned: number;
  total: number;
} {
  let assigned = 0;
  let total = 0;
  for (const item of items) {
    if (!item.countable) continue;
    total += 1;
    if (item.assigned) assigned += 1;
  }
  return { assigned, total };
}
