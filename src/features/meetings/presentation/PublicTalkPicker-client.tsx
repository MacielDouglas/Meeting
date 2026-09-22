"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { FaChevronLeft } from "react-icons/fa";
import {
  type CanonicalTalk,
  matchPublicTalk,
  type OutlineLike,
  type SpeakerHit,
  type SpeakerLike,
} from "@/features/meetings/domain/public-talk-search";
import { Button } from "@/shared/components/ui/button";
import { es } from "@/shared/i18n/es";

export interface PublicTalkSelection {
  speakerName: string;
  speakerCongregation: string;
  talkNumber: number;
  talkTheme: string;
  outlineId: string;
}

interface PublicTalkPickerProps {
  speakers: SpeakerLike[];
  outlines: OutlineLike[];
  systemCongregation: string;
  startTime: string;
  durationMinutes: number | null;
  onConfirm: (selection: PublicTalkSelection) => void;
}

type View =
  | { name: "search" }
  | { name: "talks"; speaker: SpeakerHit }
  | { name: "confirm"; speaker: SpeakerHit; talk: CanonicalTalk };

/** Oradores agrupados por congregação (a local primeiro), como na aba Oradores. */
function groupByCongregation(
  speakers: SpeakerHit[],
  systemCongregation: string,
): { congregation: string; isSystem: boolean; items: SpeakerHit[] }[] {
  const systemKey = systemCongregation.trim().toLowerCase();
  const map = new Map<string, SpeakerHit[]>();
  for (const speaker of speakers) {
    const key = speaker.congregation.trim() === "" ? es.sinCongregacion : speaker.congregation;
    const list = map.get(key) ?? [];
    list.push(speaker);
    map.set(key, list);
  }
  const groups = [...map.entries()].map(([congregation, items]) => ({
    congregation,
    isSystem: systemKey !== "" && congregation.toLowerCase() === systemKey,
    items: [...items].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
  }));
  groups.sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return a.congregation.localeCompare(b.congregation, "es");
  });
  return groups;
}

export function PublicTalkPicker({
  speakers,
  outlines,
  systemCongregation,
  startTime,
  durationMinutes,
  onConfirm,
}: PublicTalkPickerProps) {
  const [queryInput, setQueryInput] = useState("");
  const [view, setView] = useState<View>({ name: "search" });
  const query = useDeferredValue(queryInput.trim());

  const result = useMemo(
    () => matchPublicTalk(speakers, outlines, query),
    [speakers, outlines, query],
  );
  const groups = useMemo(
    () => groupByCongregation(result.speakers, systemCongregation),
    [result.speakers, systemCongregation],
  );

  function pickSpeaker(speaker: SpeakerHit) {
    if (speaker.talks.length === 1 && speaker.talks[0]) {
      setView({ name: "confirm", speaker, talk: speaker.talks[0] });
    } else {
      setView({ name: "talks", speaker });
    }
  }

  function backFromTalks() {
    setView({ name: "search" });
  }

  function backFromConfirm() {
    if (view.name !== "confirm") return;
    setView(
      view.speaker.talks.length > 1 ? { name: "talks", speaker: view.speaker } : { name: "search" },
    );
  }

  if (view.name === "confirm") {
    const { speaker, talk } = view;
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-secondary p-3 text-sm">
          <p className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{es.startTimeLabel}</span>
            <span className="font-semibold">{startTime}</span>
          </p>
          <p className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{es.temaDiscurso}</span>
            <span className="text-right font-semibold">{talk.theme}</span>
          </p>
          <p className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{es.numDiscurso}</span>
            <span className="font-semibold">{talk.number}</span>
          </p>
          {durationMinutes != null && durationMinutes > 0 && (
            <p className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">{es.duracion}</span>
              <span className="font-semibold">{durationMinutes} min</span>
            </p>
          )}
          <p className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{es.nombreOrador}</span>
            <span className="text-right font-semibold">{speaker.name}</span>
          </p>
          <p className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">{es.congregacion}</span>
            <span className="text-right font-semibold">
              {speaker.congregation || es.sinCongregacion}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              onConfirm({
                speakerName: speaker.name,
                speakerCongregation: speaker.congregation,
                talkNumber: talk.number,
                talkTheme: talk.theme,
                outlineId: talk.outlineId,
              })
            }
            className="flex-1"
          >
            {es.guardarYAsignar}
          </Button>
          <Button variant="outline" onClick={backFromConfirm} className="flex-1">
            {es.volver}
          </Button>
        </div>
      </div>
    );
  }

  if (view.name === "talks") {
    const { speaker } = view;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backFromTalks}
            aria-label={es.volver}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <FaChevronLeft aria-hidden size={14} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{speaker.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {speaker.congregation || es.sinCongregacion} · {es.elegirDiscurso}
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {speaker.talks.map((talk) => (
            <li key={talk.number}>
              <button
                type="button"
                onClick={() => setView({ name: "confirm", speaker, talk })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="w-12 shrink-0 font-semibold">{talk.number}</span>
                <span className="min-w-0 flex-1 truncate">{talk.theme}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        placeholder={es.buscarOrador}
        aria-label={es.buscarOrador}
        maxLength={60}
        className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
      />
      {outlines.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          {es.importarBosquejosHint}{" "}
          <Link href="/reunioes?tab=conteudo" className="font-medium text-accent underline">
            {es.verContenido}
          </Link>
        </p>
      )}
      {speakers.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">{es.registrarOradoresHint}</p>
      )}
      {query.length >= 2 && result.speakers.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">{es.sinOradorCoincide}</p>
      )}
      {result.outlines.length > 0 && (
        <div className="flex flex-col gap-1">
          {result.outlines.map((outline) => (
            <p key={outline.number} className="px-1 text-xs font-medium text-accent">
              N.º {outline.number} — {outline.theme}
            </p>
          ))}
        </div>
      )}
      {groups.map((group) => (
        <section key={group.congregation} aria-label={group.congregation}>
          <h3 className="px-1 font-display text-sm font-semibold tracking-tight text-accent">
            {group.congregation}
          </h3>
          <ul className="flex flex-col gap-1">
            {group.items.map((speaker) => (
              <li key={speaker.id}>
                <button
                  type="button"
                  onClick={() => pickSpeaker(speaker)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{speaker.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      N.º {speaker.talks.map((talk) => talk.number).join(", ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
