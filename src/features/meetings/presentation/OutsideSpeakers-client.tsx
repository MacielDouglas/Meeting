"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createOutsideSpeaker,
  deleteOutsideSpeaker,
  updateOutsideSpeaker,
} from "@/features/meetings/application/outside-speaker-actions";
import {
  listOutsideSpeakers,
  type OutsideSpeakerItem,
} from "@/features/meetings/application/outside-speaker-queries";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface OutsideSpeakersClientProps {
  initialSpeakers: OutsideSpeakerItem[];
  canManage: boolean;
}

const EMPTY_FORM = { name: "", congregation: "", talkNumber: "", talkTheme: "", phone: "" };

export function OutsideSpeakersClient({ initialSpeakers, canManage }: OutsideSpeakersClientProps) {
  const queryClient = useQueryClient();
  const speakersQuery = useQuery({
    queryKey: ["outside-speakers"],
    queryFn: () => listOutsideSpeakers(),
    initialData: initialSpeakers,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speakers = useMemo(() => speakersQuery.data ?? [], [speakersQuery.data]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["outside-speakers"] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        congregation: form.congregation.trim(),
        talkNumber: form.talkNumber === "" ? null : Number(form.talkNumber),
        talkTheme: form.talkTheme.trim(),
        phone: form.phone.trim(),
        notes: "",
      };
      return editingId ? updateOutsideSpeaker(editingId, payload) : createOutsideSpeaker(payload);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error ?? es.errorGuardar);
        return;
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: () => setError(es.errorGuardar),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOutsideSpeaker(id),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error ?? es.errorExcluir);
        return;
      }
      invalidate();
    },
    onError: () => setError(es.errorExcluir),
  });

  function startEdit(speaker: OutsideSpeakerItem) {
    setEditingId(speaker.id);
    setForm({
      name: speaker.name,
      congregation: speaker.congregation,
      talkNumber: speaker.talkNumber?.toString() ?? "",
      talkTheme: speaker.talkTheme,
      phone: speaker.phone,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide">
          {es.oradoresFuera}
        </h2>
        <a
          href="/reunioes/imprimir?view=slips"
          className="rounded-full bg-secondary px-3 py-1.5 font-display text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {es.fichas}
        </a>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {canManage && (
        <Card className="flex flex-col gap-2 p-3">
          <input
            value={form.name}
            onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))}
            placeholder={es.nombreOrador}
            maxLength={160}
            className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.congregation}
              onChange={(e) =>
                setForm((previous) => ({ ...previous, congregation: e.target.value }))
              }
              placeholder={es.congregacion}
              maxLength={160}
              className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
            <input
              value={form.talkNumber}
              onChange={(e) =>
                setForm((previous) => ({
                  ...previous,
                  talkNumber: e.target.value.replace(/\D/g, ""),
                }))
              }
              inputMode="numeric"
              placeholder={es.numDiscurso}
              className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
          </div>
          <input
            value={form.talkTheme}
            onChange={(e) => setForm((previous) => ({ ...previous, talkTheme: e.target.value }))}
            placeholder={es.temaDiscurso}
            maxLength={300}
            className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))}
            placeholder={es.telefonoOpcional}
            maxLength={40}
            className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none"
          />
          <div className="flex gap-2">
            <Button
              disabled={saveMutation.isPending || form.name.trim() === ""}
              onClick={() => saveMutation.mutate()}
            >
              {editingId ? es.guardarCambios : es.anadirOrador}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      )}

      {speakersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {speakers.map((speaker) => (
            <li key={speaker.id}>
              <Card className="flex items-center gap-2 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{speaker.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[speaker.congregation, speaker.talkNumber ? `N.º ${speaker.talkNumber}` : ""]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                  {speaker.talkTheme && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {speaker.talkTheme}
                    </span>
                  )}
                </span>
                {canManage && (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(speaker)}
                      className="rounded-lg px-2 py-1 font-display text-xs font-medium uppercase tracking-wider text-accent"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(speaker.id)}
                      className="rounded-lg px-2 py-1 font-display text-xs font-medium uppercase tracking-wider text-danger"
                    >
                      {es.eliminar}
                    </button>
                  </span>
                )}
              </Card>
            </li>
          ))}
          {speakers.length === 0 && (
            <li className="text-sm text-muted-foreground">{es.ningunOrador}</li>
          )}
        </ul>
      )}
    </div>
  );
}
