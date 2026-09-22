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
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {meta ? <p className="text-sm font-medium text-muted-foreground">{meta}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
