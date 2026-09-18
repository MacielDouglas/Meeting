"use client";

import { useState } from "react";
import {
  createCleaningSector,
  deleteCleaningSector,
  restoreDefaultCleaningSectors,
  setCleaningAssignmentMode,
  toggleCleaningSector,
  toggleCleaningType,
  updateCleaningSector,
} from "@/features/cleaning/application/actions";
import type { CleaningTypeItem } from "@/features/cleaning/application/queries";
import type {
  CleaningAssignmentMode,
  CleaningTypeKey,
  RequiredSex,
} from "@/features/cleaning/domain/cleaning-defaults";
import { Button } from "@/shared/components/ui/button";
import { Card, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";

const MODE_OPTIONS: { value: CleaningAssignmentMode; label: string }[] = [
  { value: "person", label: "Por pessoa" },
  { value: "family", label: "Por família" },
  { value: "group", label: "Por grupo" },
];

const SEX_OPTIONS: { value: RequiredSex; label: string }[] = [
  { value: "any", label: "Qualquer" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
];

function SectorForm({
  typeKey,
  initial,
  onDone,
}: {
  typeKey: CleaningTypeKey;
  initial?: {
    id: string;
    name: string;
    task: string;
    peopleCount: number | null;
    requiredSex: RequiredSex;
  };
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [task, setTask] = useState(initial?.task ?? "");
  const [peopleCount, setPeopleCount] = useState(
    initial?.peopleCount != null ? String(initial.peopleCount) : "",
  );
  const [requiredSex, setRequiredSex] = useState<RequiredSex>(initial?.requiredSex ?? "any");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        typeKey,
        name: name.trim(),
        task: task.trim(),
        peopleCount: peopleCount === "" ? null : Number(peopleCount),
        requiredSex,
      };
      const result = initial
        ? await updateCleaningSector({ id: initial.id, ...payload })
        : await createCleaningSector(payload);
      if (result.ok) {
        onDone();
      } else {
        setError(result.error ?? "Não foi possível salvar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-2 rounded-xl bg-secondary p-3"
    >
      {error && <p className="text-sm text-red-500">{error}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Nome do setor</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="h-10 rounded-lg bg-background px-3 text-sm outline-none focus:border focus:border-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Tarefa</span>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          className="rounded-lg bg-background px-3 py-2 text-sm outline-none focus:border focus:border-ring"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Pessoas (opcional)</span>
          <input
            type="number"
            min={1}
            max={50}
            value={peopleCount}
            onChange={(e) => setPeopleCount(e.target.value)}
            placeholder="—"
            className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Sexo (opcional)</span>
          <select
            value={requiredSex}
            onChange={(e) => setRequiredSex(e.target.value as RequiredSex)}
            className="h-10 rounded-lg bg-background px-2 text-sm outline-none"
          >
            {SEX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {initial ? "Salvar" : "Adicionar setor"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CleaningSection({ initial }: { initial: CleaningTypeItem[] }) {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<CleaningTypeKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {initial.map((cleaning) => (
        <Card key={cleaning.key} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{cleaning.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{cleaning.description}</p>
            </div>
            <Switch
              label={`Ativar ${cleaning.label}`}
              checked={cleaning.enabled}
              onCheckedChange={(checked) =>
                void toggleCleaningType({ key: cleaning.key, enabled: checked })
              }
            />
          </div>

          {/* Modo de escala: pessoa / família / grupo (exclusivo, padrão pessoa) */}
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Escalar limpeza por:</span>
            <div className="flex gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    void setCleaningAssignmentMode({ key: cleaning.key, mode: opt.value })
                  }
                  className={`h-9 flex-1 rounded-full px-3 text-sm font-medium transition-colors ${
                    cleaning.assignmentMode === opt.value
                      ? "bg-sky-500 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {cleaning.sectors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum setor. Adicione abaixo ou restaure os padrões.
              </p>
            )}
            {cleaning.sectors.map((sector) => (
              <div key={sector.id} className="rounded-xl bg-secondary p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {sector.name}{" "}
                      {sector.isDefault && (
                        <span className="text-xs font-normal text-muted-foreground">(padrão)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{sector.task}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sector.peopleCount != null
                        ? `${sector.peopleCount} pessoa(s)`
                        : "Qtd. livre"}
                      {" · "}
                      {sector.requiredSex === "any"
                        ? "Sexo: qualquer"
                        : sector.requiredSex === "male"
                          ? "Sexo: masculino"
                          : "Sexo: feminino"}
                    </p>
                  </div>
                  <Switch
                    label={`Ativar setor ${sector.name}`}
                    checked={sector.enabled}
                    onCheckedChange={(checked) =>
                      void toggleCleaningSector({ id: sector.id, enabled: checked })
                    }
                  />
                </div>
                {editingId === sector.id ? (
                  <div className="mt-2">
                    <SectorForm
                      typeKey={cleaning.key}
                      initial={{
                        id: sector.id,
                        name: sector.name,
                        task: sector.task,
                        peopleCount: sector.peopleCount,
                        requiredSex: sector.requiredSex,
                      }}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(sector.id)}
                      className="text-xs font-medium text-sky-500"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCleaningSector({ id: sector.id })}
                      className="text-xs font-medium text-red-500"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showForm === cleaning.key ? (
            <SectorForm typeKey={cleaning.key} onDone={() => setShowForm(null)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowForm(cleaning.key)}>
                + Novo setor
              </Button>
              <Button
                variant="outline"
                disabled={restoring === cleaning.key}
                onClick={() => {
                  setRestoring(cleaning.key);
                  void restoreDefaultCleaningSectors({ key: cleaning.key }).finally(() =>
                    setRestoring(null),
                  );
                }}
              >
                {restoring === cleaning.key ? "Restaurando…" : "Recuperar setores padrão"}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
