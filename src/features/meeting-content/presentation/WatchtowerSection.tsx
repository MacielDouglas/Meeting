"use client";

import { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import type { AnyInspectResult } from "@/features/meeting-content/application/actions";
import {
  deleteWatchtowerArticle,
  deleteWatchtowerIssue,
  saveWatchtowerIssue,
  updateWatchtowerArticle,
} from "@/features/meeting-content/application/watchtower-actions";
import type {
  WatchtowerArticleItem,
  WatchtowerIssueItem,
} from "@/features/meeting-content/application/watchtower-queries";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { es } from "@/shared/i18n/es";

function SongLine({
  label,
  number,
  theme,
  language,
}: {
  label: string;
  number: number | null;
  theme: string | null;
  language: string;
}) {
  if (number == null) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {label}: {number}
      {theme ? <> — {theme}</> : <> (tema no importado — importa el cancionero en {language})</>}
    </p>
  );
}

export function WatchtowerImportModal({
  inspected,
  onClose,
  onSaved,
}: {
  inspected: Extract<AnyInspectResult, { ok: true; kind: "watchtower" }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const result = await saveWatchtowerIssue({
        symbol: inspected.symbol,
        name: inspected.name,
        language: inspected.language,
        source: inspected.source,
        articles: inspected.articles,
      });
      if (result.ok) {
        onSaved(`Edición ${inspected.symbol} guardada con ${result.total} artículos.`);
        onClose();
      } else {
        setSaveError(result.error ?? es.errorGuardar);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inspected.symbol} · {inspected.name}
          </DialogTitle>
          <DialogDescription>
            {inspected.articles?.length ?? 0} artículos de estudio
          </DialogDescription>
        </DialogHeader>
        {inspected.hadExisting ? (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
            Este contenido ({inspected.symbol}, {inspected.articles?.length ?? 0} artículos){" "}
            {es.yaExisteSubstituir}. {es.deseaSubstituir}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {inspected.articles?.map((article) => (
              <li key={article.weekLabel} className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">{article.weekLabel}</p>
                <p className="font-semibold">{article.title}</p>
                <p className="text-xs text-muted-foreground">
                  Cánticos: {article.openingSong ?? "—"} → {article.closingSong ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        <DialogFooter className="flex-col sm:flex-row">
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? es.guardando : inspected.hadExisting ? "Reemplazar" : es.save}
          </Button>
          <DialogClose>{es.cancel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WatchtowerSection({
  initial,
  canManage,
}: {
  initial: WatchtowerIssueItem[];
  canManage: boolean;
}) {
  const [deleteTarget, setDeleteTarget] = useState<WatchtowerIssueItem | null>(null);
  const [selected, setSelected] = useState<{
    issue: WatchtowerIssueItem;
    article: WatchtowerArticleItem;
  } | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {initial.length === 0 && (
        <Card className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Todavía no hay ediciones importadas. Usa “Importar .jwpub” para añadir la Atalaya.
          </p>
        </Card>
      )}
      {initial.map((issue) => (
        <Card key={issue.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{issue.symbol}</p>
              <p className="text-sm text-muted-foreground">{issue.name}</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setDeleteTarget(issue)}
                aria-label={`${es.eliminar} la edición ${issue.symbol}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-danger transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <FaTrashAlt aria-hidden size={18} />
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {issue.articles.map((article) => (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => setSelected({ issue, article })}
                  className="block w-full rounded-xl bg-secondary p-3 text-left"
                >
                  <p className="text-xs font-medium text-accent">{article.weekLabel}</p>
                  <p className="text-sm font-semibold">{article.title}</p>
                  <div className="mt-1">
                    <SongLine
                      label="Cántico inicial"
                      number={article.openingSong}
                      theme={article.openingSongTheme}
                      language={issue.language.toUpperCase()}
                    />
                    <SongLine
                      label="Cántico final"
                      number={article.closingSong}
                      theme={article.closingSongTheme}
                      language={issue.language.toUpperCase()}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {selected && (
        <ArticleModal
          issue={selected.issue}
          article={
            initial
              .find((row) => row.id === selected.issue.id)
              ?.articles.find((row) => row.id === selected.article.id) ?? selected.article
          }
          canManage={canManage}
          onDeleted={() => setSelected(null)}
          onClose={() => setSelected(null)}
        />
      )}
      {deleteTarget && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {es.eliminar} la edición {deleteTarget.symbol}
              </DialogTitle>
              <DialogDescription>
                ¿Eliminar {deleteTarget.symbol} ({deleteTarget.name})? Los artículos se eliminarán
                también. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row">
              <Button
                className="border-transparent bg-danger text-danger-ink"
                onClick={() => {
                  void deleteWatchtowerIssue({ id: deleteTarget.id }).then(() =>
                    setDeleteTarget(null),
                  );
                }}
              >
                {es.confirmarExclusion}
              </Button>
              <DialogClose>{es.cancel}</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ArticleModal({
  issue,
  article,
  canManage,
  onDeleted,
  onClose,
}: {
  issue: WatchtowerIssueItem;
  article: WatchtowerArticleItem;
  canManage: boolean;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [weekLabel, setWeekLabel] = useState(article.weekLabel);
  const [title, setTitle] = useState(article.title);
  const [openingSong, setOpeningSong] = useState(
    article.openingSong != null ? String(article.openingSong) : "",
  );
  const [closingSong, setClosingSong] = useState(
    article.closingSong != null ? String(article.closingSong) : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const result = await updateWatchtowerArticle({
        id: article.id,
        weekLabel: weekLabel.trim(),
        title: title.trim(),
        openingSong: openingSong === "" ? null : Number(openingSong),
        closingSong: closingSong === "" ? null : Number(closingSong),
      });
      if (result.ok) {
        setEditing(false);
      } else {
        setFormError(result.error ?? es.errorGuardar);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const result = await deleteWatchtowerArticle({ id: article.id });
    if (result.ok) onDeleted();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article.title}</DialogTitle>
          <DialogDescription>{article.weekLabel}</DialogDescription>
        </DialogHeader>
        {editing ? (
          <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-2">
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.weekLabel}</span>
              <input
                value={weekLabel}
                onChange={(event) => setWeekLabel(event.target.value)}
                required
                maxLength={80}
                className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{es.eventTitle}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
                className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Cántico inicial</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={openingSong}
                  onChange={(event) => setOpeningSong(event.target.value)}
                  className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Cántico final</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={closingSong}
                  onChange={(event) => setClosingSong(event.target.value)}
                  className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? es.guardando : es.save}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                {es.cancel}
              </Button>
            </div>
          </form>
        ) : confirmingDelete ? (
          <p className="text-sm">
            ¿Eliminar el estudio “{article.title}”? Esta acción no se puede deshacer.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <SongLine
              label="Cántico inicial"
              number={article.openingSong}
              theme={article.openingSongTheme}
              language={issue.language.toUpperCase()}
            />
            <SongLine
              label="Cántico final"
              number={article.closingSong}
              theme={article.closingSongTheme}
              language={issue.language.toUpperCase()}
            />
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row">
          {canManage && !editing && !confirmingDelete && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                {es.editarLabel}
              </Button>
              <Button
                className="border-transparent bg-danger text-danger-ink"
                onClick={() => setConfirmingDelete(true)}
              >
                {es.eliminar}
              </Button>
            </>
          )}
          {confirmingDelete && (
            <Button
              className="border-transparent bg-danger text-danger-ink"
              onClick={() => void handleDelete()}
            >
              {es.confirmarExclusion}
            </Button>
          )}
          {confirmingDelete ? (
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              {es.volver}
            </Button>
          ) : (
            !editing && <DialogClose>{es.cancel}</DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
