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
import {
  newTalkDraft,
  SpeakerTalkFields,
  type TalkDraft,
} from "@/features/meetings/presentation/SpeakerTalkFields-client";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface OutsideSpeakersClientProps {
  initialSpeakers: OutsideSpeakerItem[];
  initialOutlines: { number: number; theme: string }[];
  systemCongregation: string;
  canManage: boolean;
}

const EMPTY_FORM = { name: "", congregation: "", phone: "" };

function toTalkDrafts(speaker: OutsideSpeakerItem): TalkDraft[] {
  if (speaker.talks.length === 0) return [newTalkDraft()];
  return speaker.talks.map((talk) => ({
    key: `${talk.id}`,
    number: String(talk.talkNumber),
    theme: talk.talkTheme,
  }));
}

export function OutsideSpeakersClient({
  initialSpeakers,
  initialOutlines,
  systemCongregation,
  canManage,
}: OutsideSpeakersClientProps) {
  const queryClient = useQueryClient();

  const speakersQuery = useQuery({
    queryKey: ["outside-speakers"],
    queryFn: () => listOutsideSpeakers(),
    initialData: initialSpeakers,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [talks, setTalks] = useState<TalkDraft[]>([newTalkDraft()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speakers = useMemo(() => speakersQuery.data ?? [], [speakersQuery.data]);
  const editingSpeaker = useMemo(
    () => speakers.find((speaker) => speaker.id === editingId) ?? null,
    [speakers, editingId],
  );

  const congregations = useMemo(() => {
    const names = new Set<string>();
    for (const speaker of speakers) {
      if (speaker.congregation.trim() !== "") names.add(speaker.congregation.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b, "es"));
  }, [speakers]);

  const systemKey = systemCongregation.trim().toLowerCase();

  const groups = useMemo(() => {
    const map = new Map<string, OutsideSpeakerItem[]>();
    for (const speaker of speakers) {
      const key = speaker.congregation.trim() === "" ? es.sinCongregacion : speaker.congregation;
      const list = map.get(key) ?? [];
      list.push(speaker);
      map.set(key, list);
    }
    const entries = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([congregation, items]) => ({
        congregation,
        isSystem: systemKey !== "" && congregation.toLowerCase() === systemKey,
        items: [...items].sort((a, b) =>
          a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
        ),
      }));
    return [
      ...entries.filter((group) => group.isSystem),
      ...entries.filter((group) => !group.isSystem),
    ];
  }, [speakers, systemKey]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["outside-speakers"] });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setTalks([newTalkDraft()]);
    setEditingId(null);
    setError(null);
  }

  function parsedTalks(): { talkNumber: number; talkTheme: string }[] {
    return talks.flatMap((talk) => {
      const talkNumber = Number(talk.number);
      if (!Number.isInteger(talkNumber) || talkNumber <= 0) return [];
      return [{ talkNumber, talkTheme: talk.theme.trim() }];
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = editingSpeaker
        ? {
            name: editingSpeaker.name,
            congregation: editingSpeaker.congregation,
            phone: editingSpeaker.phone,
            notes: editingSpeaker.notes,
            talks: parsedTalks(),
          }
        : {
            name: form.name.trim(),
            congregation: form.congregation.trim(),
            phone: form.phone.trim(),
            notes: "",
            talks: parsedTalks(),
          };
      return editingId ? updateOutsideSpeaker(editingId, payload) : createOutsideSpeaker(payload);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error ?? es.errorGuardar);
        return;
      }
      resetForm();
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
    setForm({ name: speaker.name, congregation: speaker.congregation, phone: speaker.phone });
    setTalks(toTalkDrafts(speaker));
    setError(null);
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
          {editingSpeaker ? (
            <div className="flex flex-col gap-1 rounded-lg bg-secondary px-3 py-2">
              <p className="text-sm font-medium">{editingSpeaker.name}</p>
              <p className="text-xs text-muted-foreground">
                {editingSpeaker.congregation || es.sinCongregacion}
              </p>
            </div>
          ) : (
            <>
              <input
                value={form.name}
                onChange={(e) => setForm((previous) => ({ ...previous, name: e.target.value }))}
                placeholder={es.nombreOradorLabel}
                aria-label={es.nombreOradorLabel}
                maxLength={160}
                className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.congregation}
                  onChange={(e) =>
                    setForm((previous) => ({ ...previous, congregation: e.target.value }))
                  }
                  placeholder={es.congregacionLabel}
                  aria-label={es.congregacionLabel}
                  maxLength={160}
                  list="speaker-congregations"
                  className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
                />
                <datalist id="speaker-congregations">
                  {congregations.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((previous) => ({ ...previous, phone: e.target.value }))}
                  placeholder={es.telefonoOpcional}
                  aria-label={es.telefonoLabel}
                  maxLength={40}
                  className="h-9 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
                />
              </div>
            </>
          )}

          <SpeakerTalkFields talks={talks} outlines={initialOutlines} onChange={setTalks} />

          <div className="flex gap-2">
            <Button
              disabled={saveMutation.isPending || (!editingSpeaker && form.name.trim() === "")}
              onClick={() => saveMutation.mutate()}
            >
              {editingId ? es.guardarCambios : es.anadirOrador}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                {es.descartar}
              </Button>
            )}
          </div>
        </Card>
      )}

      {speakersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{es.cargandoOradores}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.congregation} aria-label={group.congregation}>
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-accent">
                {group.congregation}
                {group.isSystem && <Badge>{es.sistema}</Badge>}
              </h3>
              <ul className="mt-1 flex flex-col gap-2">
                {group.items.map((speaker) => (
                  <li key={speaker.id}>
                    <Card className="flex items-center gap-2 p-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{speaker.name}</span>
                        {speaker.talks.length > 0 ? (
                          <span className="mt-0.5 flex flex-col">
                            {speaker.talks.map((talk) => (
                              <span
                                key={talk.id}
                                className="block truncate text-xs text-muted-foreground"
                              >
                                N.º {talk.talkNumber}
                                {talk.talkTheme ? ` — ${talk.talkTheme}` : ""}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                      {canManage && (
                        <span className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(speaker)}
                            aria-label={`${es.editarLabel} a ${speaker.name}`}
                            className="rounded-lg px-2 py-1 font-display text-xs font-medium uppercase tracking-wider text-accent"
                          >
                            {es.editarLabel}
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
              </ul>
            </section>
          ))}
          {speakers.length === 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{es.ningunOrador}</p>
              {canManage && <p className="text-sm text-muted-foreground">{es.anadePrimerOrador}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
