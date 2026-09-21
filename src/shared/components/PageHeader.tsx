import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: string;
  actions?: ReactNode;
}

/** Cabeçalho padrão de todas as telas: display condensado + meta atlética + ações. */
export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold uppercase leading-none tracking-wide">
          {title}
        </h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {meta ? (
          <p className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
