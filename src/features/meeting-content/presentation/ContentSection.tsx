"use client";

import { useMemo, useRef, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import {
  type AnyInspectResult,
  createManualItem,
  deleteAllByLanguage,
  deleteItem,
  inspectAnyJwpub,
  saveInspectedJwpub,
  updateManualItem,
} from "@/features/meeting-content/application/actions";
import type {
  ContentCounts,
  OutlineItem,
  SongItem,
} from "@/features/meeting-content/application/queries";
import type { WatchtowerIssueItem } from "@/features/meeting-content/application/watchtower-queries";
import type { WorkbookIssueItem } from "@/features/meeting-content/application/workbook-queries";
import type { ContentLanguage } from "@/features/meeting-content/infrastructure/meeting-content-schema";
import {
  WatchtowerImportModal,
  WatchtowerSection,
} from "@/features/meeting-content/presentation/WatchtowerSection";
import {
  WorkbookImportModal,
  WorkbookSection,
} from "@/features/meeting-content/presentation/WorkbookSection";
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
import { Card, CardTitle } from "@/shared/components/ui/card";

const LANGUAGES: { value: ContentLanguage; label: string }[] = [
  { value: "es", label: "Español (_S)" },
  { value: "pt", label: "Português (_T)" },
  { value: "en", label: "English (_E)" },
];

function LanguageBadge({ language }: { language: ContentLanguage }) {
  const label = language === "es" ? "ES" : language === "pt" ? "PT" : "EN";
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function kindLabel(kind: "songs" | "outlines"): string {
  return kind === "songs" ? "Cânticos" : "Esboços de discursos";
}

function languageLabel(language: ContentLanguage): string {
  if (language === "es") return "Espanhol";
  if (language === "pt") return "Português";
  return "Inglês";
}

type SmartInspected = Extract<AnyInspectResult, { ok: true }>;

function ImportModal({
  inspected,
  onClose,
  onSaved,
}: {
  inspected: Extract<SmartInspected, { kind: "songs" | "outlines" }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [items, setItems] = useState(() =>
    (inspected.items ?? []).map((item, position) => ({
      ...item,
      key: `${item.number}-${position}`,
    })),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateItem(key: string, field: "number" | "theme", value: string) {
    setItems((previous) =>
      previous.map((item) =>
        item.key === key ? { ...item, [field]: field === "number" ? Number(value) : value } : item,
      ),
    );
  }

  function removeItem(key: string) {
    setItems((previous) => previous.filter((item) => item.key !== key));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const result = await saveInspectedJwpub({
        kind: inspected.kind,
        language: inspected.language,
        source: inspected.source ?? "jwpub",
        items: items
          .filter((item) => item.number > 0 && item.theme.trim() !== "")
          .map((item) => ({ number: item.number, theme: item.theme.trim() })),
      });
      if (result.ok) {
        onSaved(
          `Salvo: ${result.total} itens (${kindLabel(inspected.kind)} · ${languageLabel(inspected.language)}). Novos: ${result.inserted}, atualizados: ${result.updated}.`,
        );
        onClose();
      } else {
        setSaveError(result.error ?? "Falha ao salvar.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revisar conteúdo do .jwpub"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-0 sm:items-center sm:p-4"
    >
      <div className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-hidden rounded-none bg-background p-4 sm:rounded-2xl">
        <h2 className="text-lg font-bold">
          {kindLabel(inspected.kind)} · {languageLabel(inspected.language)} · {items.length} itens
        </h2>
        {inspected.hadExisting ? (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
            Este conteúdo ({kindLabel(inspected.kind).toLowerCase()}, {items.length} itens,{" "}
            {languageLabel(inspected.language).toLowerCase()}) já existe no banco de dados (
            {inspected.existingCount} registros). Deseja substituir?
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Revise o conteúdo e edite antes de salvar, se precisar.
          </p>
        )}
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5"
            >
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={item.number}
                onChange={(event) => updateItem(item.key, "number", event.target.value)}
                aria-label={`Número do cântico ${item.number}`}
                className="h-8 w-16 shrink-0 rounded bg-background px-2 text-sm outline-none"
              />
              <input
                value={item.theme}
                onChange={(event) => updateItem(item.key, "theme", event.target.value)}
                required
                maxLength={200}
                aria-label={`Tema do item ${item.number}`}
                className="h-8 min-w-0 flex-1 rounded bg-background px-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                aria-label={`Remover item ${item.number}`}
                className="shrink-0 text-xs font-medium text-red-500"
              >
                X
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button disabled={saving || items.length === 0} onClick={() => void handleSave()}>
            {saving ? "Salvando…" : inspected.hadExisting ? "Substituir" : "Salvar"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function SmartImportCard({
  canManage,
  status,
  onInspected,
}: {
  canManage: boolean;
  status: string | null;
  onInspected: (result: SmartInspected) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await inspectAnyJwpub(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onInspected(result);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!canManage) return null;

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Conteúdo das reuniões</CardTitle>
      <p className="text-sm text-muted-foreground">
        Envie qualquer arquivo .jwpub do seu aparelho: cânticos, esboços ou Sentinela. O app
        identifica o tipo e abre a revisão na aba correta.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {status && <p className="text-sm text-emerald-500">{status}</p>}
      <input
        ref={fileRef}
        type="file"
        accept=".jwpub"
        aria-label="Arquivo .jwpub"
        className="hidden"
        onChange={(event) => void handleFileSelected(event.target.files?.[0])}
      />
      <div>
        <Button disabled={reading} onClick={() => fileRef.current?.click()}>
          {reading ? "Lendo arquivo…" : "Importar .jwpub"}
        </Button>
      </div>
    </Card>
  );
}

interface EntryListProps {
  kind: "songs" | "outlines";
  items: (SongItem | OutlineItem)[];
  canManage: boolean;
}

function EntryList({ kind, items, canManage }: EntryListProps) {
  const [language, setLanguage] = useState<ContentLanguage | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [number, setNumber] = useState("");
  const [theme, setTheme] = useState("");
  const [formLanguage, setFormLanguage] = useState<ContentLanguage>("es");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (language !== "all" && item.language !== language) return false;
      if (!term) return true;
      return String(item.number).includes(term) || item.theme.toLowerCase().includes(term);
    });
  }, [items, language, search]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const result = await createManualItem({
      kind,
      number: Number(number),
      theme: theme.trim(),
      language: formLanguage,
    });
    if (result.ok) {
      setNumber("");
      setTheme("");
      setShowForm(false);
    } else {
      setFormError(result.error ?? "Falha ao salvar.");
    }
  }

  async function handleUpdate(item: SongItem | OutlineItem) {
    const result = await updateManualItem({
      kind,
      id: item.id,
      number: item.number,
      theme: item.theme,
    });
    if (result.ok) setEditingId(null);
  }

  const title = kind === "songs" ? "Cânticos" : "Esboços de discursos públicos";
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>
          {title} ({filtered.length})
        </CardTitle>
      </div>
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por número ou tema…"
          className="h-10 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none"
        />
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as ContentLanguage | "all")}
          className="h-10 rounded-lg bg-secondary px-2 text-sm outline-none"
          aria-label="Filtrar por idioma"
        >
          <option value="all">Todos</option>
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedId(item.id);
                setEditingId(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-left text-sm"
            >
              <span className="w-12 shrink-0 font-semibold">{item.number}</span>
              <span className="flex-1">{item.theme}</span>
              <LanguageBadge language={item.language} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhum registro encontrado.</li>
        )}
      </ul>
      {selected && (
        <EntryModal
          kind={kind}
          item={selected}
          canManage={canManage}
          editing={editingId === selected.id}
          onStartEdit={() => setEditingId(selected.id)}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={(numberValue, themeValue) =>
            void handleUpdate({ ...selected, number: numberValue, theme: themeValue })
          }
          onDeleted={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
          onClose={() => {
            setSelectedId(null);
            setEditingId(null);
          }}
        />
      )}

      {canManage &&
        (showForm ? (
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="flex flex-col gap-2 rounded-xl bg-secondary p-3"
          >
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Número</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Idioma</span>
                <select
                  value={formLanguage}
                  onChange={(event) => setFormLanguage(event.target.value as ContentLanguage)}
                  className="h-10 rounded-lg bg-background px-2 text-sm outline-none"
                >
                  {LANGUAGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Tema</span>
              <input
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                required
                maxLength={200}
                className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit">Adicionar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowForm(true)}>
              + Adicionar manual
            </Button>
            {language !== "all" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Apagar todos (${title} · ${language.toUpperCase()})?`)) {
                    void deleteAllByLanguage({ kind, language });
                  }
                }}
              >
                Apagar todos ({language.toUpperCase()})
              </Button>
            )}
          </div>
        ))}
    </Card>
  );
}

function EntryModal({
  kind,
  item,
  canManage,
  editing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleted,
  onClose,
}: {
  kind: "songs" | "outlines";
  item: SongItem | OutlineItem;
  canManage: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (number: number, theme: string) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const singular = kind === "songs" ? "Cântico" : "Esboço";

  async function handleDelete() {
    const result = await deleteItem({ kind, id: item.id });
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
          <AlertDialogTitle>
            {singular} {item.number}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {item.language === "es" ? "Espanhol" : item.language === "pt" ? "Português" : "Inglês"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {editing ? (
          <EditRow item={item} onCancel={onCancelEdit} onSave={onSaveEdit} />
        ) : confirmingDelete ? (
          <p className="text-sm">
            Apagar {singular.toLowerCase()} {item.number} (“{item.theme}”)? Esta ação não pode ser
            desfeita.
          </p>
        ) : (
          <p className="text-base">{item.theme}</p>
        )}
        <AlertDialogFooter className="flex-col sm:flex-row">
          {canManage && !editing && !confirmingDelete && (
            <>
              <Button variant="outline" onClick={onStartEdit}>
                Editar
              </Button>
              <Button
                className="border-transparent bg-red-500 text-white"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Apagar ${singular.toLowerCase()} ${item.number}`}
              >
                <FaTrashAlt aria-hidden size={16} />
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

function EditRow({
  item,
  onCancel,
  onSave,
}: {
  item: SongItem | OutlineItem;
  onCancel: () => void;
  onSave: (number: number, theme: string) => void;
}) {
  const [number, setNumber] = useState(String(item.number));
  const [theme, setTheme] = useState(item.theme);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Number(number), theme.trim());
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="flex w-1/4 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Número</span>
          <input
            type="number"
            min={1}
            max={1000}
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Tema</span>
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            required
            maxLength={200}
            className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="sm">
          Salvar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

type ContentSubTab = "sentinela" | "apostila" | "esbocos" | "canticos";

const SUBTABS: { value: ContentSubTab; label: string }[] = [
  { value: "sentinela", label: "Sentinela" },
  { value: "apostila", label: "Apostila" },
  { value: "esbocos", label: "Esboços" },
  { value: "canticos", label: "Cânticos" },
];

export function ContentSection({
  initialSongs,
  initialOutlines,
  initialIssues,
  initialWorkbooks,
  counts,
  canManage,
}: {
  initialSongs: SongItem[];
  initialOutlines: OutlineItem[];
  initialIssues: WatchtowerIssueItem[];
  initialWorkbooks: WorkbookIssueItem[];
  counts: ContentCounts;
  canManage: boolean;
}) {
  const [subTab, setSubTab] = useState<ContentSubTab>("sentinela");
  const [status, setStatus] = useState<string | null>(null);
  const [smart, setSmart] = useState<SmartInspected | null>(null);

  function handleInspected(result: SmartInspected) {
    setSmart(result);
    if (result.kind === "songs") setSubTab("canticos");
    else if (result.kind === "outlines") setSubTab("esbocos");
    else if (result.kind === "workbook") setSubTab("apostila");
    else setSubTab("sentinela");
  }

  return (
    <div className="flex flex-col gap-4">
      <SmartImportCard canManage={canManage} status={status} onInspected={handleInspected} />
      {smart && (smart.kind === "songs" || smart.kind === "outlines") && (
        <ImportModal
          inspected={smart}
          onClose={() => setSmart(null)}
          onSaved={(message) => setStatus(message)}
        />
      )}
      {smart && smart.kind === "watchtower" && (
        <WatchtowerImportModal
          inspected={smart}
          onClose={() => setSmart(null)}
          onSaved={(message) => setStatus(message)}
        />
      )}
      {smart && smart.kind === "workbook" && (
        <WorkbookImportModal
          inspected={smart}
          onClose={() => setSmart(null)}
          onSaved={(message) => setStatus(message)}
        />
      )}

      <nav className="flex gap-2" aria-label="Tipos de conteúdo">
        {SUBTABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setSubTab(item.value)}
            className={`h-9 flex-1 rounded-full px-2 text-sm font-medium transition-colors ${
              subTab === item.value ? "bg-sky-500 text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subTab === "canticos" && (
        <>
          <Card className="flex flex-col gap-1">
            <CardTitle>Conteúdo salvo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cânticos — ES: {counts.songsEs} · PT: {counts.songsPt} · EN: {counts.songsEn}
            </p>
            {!canManage && (
              <p className="text-sm text-muted-foreground">Você tem acesso de visualização.</p>
            )}
          </Card>
          <EntryList kind="songs" items={initialSongs} canManage={canManage} />
        </>
      )}

      {subTab === "esbocos" && (
        <>
          <Card className="flex flex-col gap-1">
            <CardTitle>Conteúdo salvo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Esboços — ES: {counts.outlinesEs} · PT: {counts.outlinesPt} · EN: {counts.outlinesEn}
            </p>
            {!canManage && (
              <p className="text-sm text-muted-foreground">Você tem acesso de visualização.</p>
            )}
          </Card>
          <EntryList kind="outlines" items={initialOutlines} canManage={canManage} />
        </>
      )}

      {subTab === "sentinela" && (
        <WatchtowerSection initial={initialIssues} canManage={canManage} />
      )}

      {subTab === "apostila" && (
        <WorkbookSection initial={initialWorkbooks} canManage={canManage} />
      )}
    </div>
  );
}
