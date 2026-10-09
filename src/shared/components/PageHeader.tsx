import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: string;
  actions?: ReactNode;
}

/** Cabeçalho padrão de todas as telas: display lidera, meta suporta, ações à direita. */
export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-1">
      <div className="flex min-w-0 flex-1 basis-52 flex-col">
        <h1 className="text-balance font-display text-4xl font-semibold leading-[1.1] tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-1.5 text-[13px] font-medium tabular-nums leading-normal text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div> : null}
    </header>
  );
}
