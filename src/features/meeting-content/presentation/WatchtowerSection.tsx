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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

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
      {theme ? <> — {theme}</> : <> (tema não importado — importe o sjj em {language})</>}
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
        onSaved(`Edição ${inspected.symbol} salva com ${result.total} artigos.`);
        onClose();
      } else {
        setSaveError(result.error ?? "Falha ao salvar.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {inspected.symbol} · {inspected.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {inspected.articles?.length ?? 0} artigos de estudo
          </AlertDialogDescription>
        </AlertDialogHeader>
        {inspected.hadExisting ? (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
            Este conteúdo ({inspected.symbol}, {inspected.articles?.length ?? 0} artigos) já existe
            no banco de dados. Deseja substituir?
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {inspected.articles?.map((article) => (
              <li key={article.weekLabel} className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">{article.weekLabel}</p>
                <p className="font-semibold">{article.title}</p>
                <p className="text-xs text-muted-foreground">
                  Cânticos: {article.openingSong ?? "—"} → {article.closingSong ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        <AlertDialogFooter className="flex-col sm:flex-row">
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Salvando…" : inspected.hadExisting ? "Substituir" : "Salvar"}
          </Button>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          <p className="text-sm text-muted-foreground">Nenhuma edição importada.</p>
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
                aria-label={`Apagar edição ${issue.symbol}`}
                className="rounded-lg p-2 text-red-500"
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
                  <p className="text-xs font-medium text-sky-500">{article.weekLabel}</p>
                  <p className="text-sm font-semibold">{article.title}</p>
                  <div className="mt-1">
                    <SongLine
                      label="Cântico inicial"
                      number={article.openingSong}
                      theme={article.openingSongTheme}
                      language={issue.language.toUpperCase()}
                    />
                    <SongLine
                      label="Cântico final"
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
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar edição</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja apagar {deleteTarget.symbol} ({deleteTarget.name})? Os artigos serão apagados
                junto. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row">
              <Button
                className="border-transparent bg-red-500 text-white"
                onClick={() => {
                  void deleteWatchtowerIssue({ id: deleteTarget.id }).then(() =>
                    setDeleteTarget(null),
                  );
                }}
              >
                Confirmar
              </Button>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
        setFormError(result.error ?? "Falha ao salvar.");
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
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{article.title}</AlertDialogTitle>
          <AlertDialogDescription>{article.weekLabel}</AlertDialogDescription>
        </AlertDialogHeader>
        {editing ? (
          <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-2">
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Semana</span>
              <input
                value={weekLabel}
                onChange={(event) => setWeekLabel(event.target.value)}
                required
                maxLength={80}
                className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Título</span>
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
                <span className="text-muted-foreground">Cântico inicial</span>
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
                <span className="text-muted-foreground">Cântico final</span>
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
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : confirmingDelete ? (
          <p className="text-sm">
            Deletar o estudo “{article.title}”? Esta ação não pode ser desfeita.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <SongLine
              label="Cântico inicial"
              number={article.openingSong}
              theme={article.openingSongTheme}
              language={issue.language.toUpperCase()}
            />
            <SongLine
              label="Cântico final"
              number={article.closingSong}
              theme={article.closingSongTheme}
              language={issue.language.toUpperCase()}
            />
          </div>
        )}
        <AlertDialogFooter className="flex-col sm:flex-row">
          {canManage && !editing && !confirmingDelete && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button
                className="border-transparent bg-red-500 text-white"
                onClick={() => setConfirmingDelete(true)}
              >
                Deletar
              </Button>
            </>
          )}
          {confirmingDelete && (
            <Button
              className="border-transparent bg-red-500 text-white"
              onClick={() => void handleDelete()}
            >
              Confirmar exclusão
            </Button>
          )}
          {confirmingDelete ? (
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Voltar
            </Button>
          ) : (
            !editing && <AlertDialogCancel>Cancelar</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
