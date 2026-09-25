import type { ReactNode } from "react";
import { Card } from "@/shared/components/ui/card";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Estado vazio padrão: o-quê (título), porquê (descrição) e CTA (ação),
 * com interesse visual no emblema. Para primeiro uso, busca sem resultado
 * e permissões — nunca só texto solto.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      {icon ? (
        <span
          aria-hidden
          className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground"
        >
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="-mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}
