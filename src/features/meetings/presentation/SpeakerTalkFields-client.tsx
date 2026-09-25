"use client";

import { useMemo } from "react";
import { FaXmark } from "react-icons/fa6";
import { es } from "@/shared/i18n/es";

export interface TalkDraft {
  key: string;
  number: string;
  theme: string;
}

export function newTalkDraft(): TalkDraft {
  return {
    key: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    number: "",
    theme: "",
  };
}

interface SpeakerTalkFieldsProps {
  talks: TalkDraft[];
  outlines: { number: number; theme: string }[];
  onChange: (talks: TalkDraft[]) => void;
}

/**
 * Linhas de discursos: número preenche o tema sozinho (editável), tema livre
 * aceita discurso fora da lista, adicionar/remover até 20.
 */
export function SpeakerTalkFields({ talks, outlines, onChange }: SpeakerTalkFieldsProps) {
  const themeByNumber = useMemo(() => {
    const map = new Map<number, string>();
    for (const outline of outlines) {
      if (!map.has(outline.number)) map.set(outline.number, outline.theme);
    }
    return map;
  }, [outlines]);

  function updateTalk(key: string, field: "number" | "theme", value: string) {
    onChange(
      talks.map((talk) => {
        if (talk.key !== key) return talk;
        if (field === "number") {
          const clean = value.replace(/\D/g, "").slice(0, 4);
          const previousAuto = themeByNumber.get(Number(talk.number)) ?? "";
          const auto = themeByNumber.get(Number(clean)) ?? "";
          return {
            ...talk,
            number: clean,
            theme: talk.theme.trim() === "" || talk.theme === previousAuto ? auto : talk.theme,
          };
        }
        return { ...talk, theme: value.slice(0, 300) };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {talks.map((talk) => (
        <div key={talk.key} className="flex gap-2">
          <input
            value={talk.number}
            onChange={(e) => updateTalk(talk.key, "number", e.target.value)}
            inputMode="numeric"
            placeholder={es.numDiscurso}
            aria-label={es.numDiscurso}
            maxLength={4}
            className="h-9 w-24 shrink-0 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
          <input
            value={talk.theme}
            onChange={(e) => updateTalk(talk.key, "theme", e.target.value)}
            placeholder={es.temaDiscurso}
            aria-label={es.temaDiscurso}
            maxLength={300}
            className="h-9 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
          {talks.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(talks.filter((t) => t.key !== talk.key))}
              aria-label={es.eliminar}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
            >
              <FaXmark aria-hidden size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => talks.length < 20 && onChange([...talks, newTalkDraft()])}
        className="self-start rounded-lg bg-secondary px-3 min-h-11 font-display font-medium text-muted-foreground"
      >
        + {es.anadirDiscurso}
      </button>
    </div>
  );
}
