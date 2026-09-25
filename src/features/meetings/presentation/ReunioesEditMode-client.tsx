"use client";

import { useSyncExternalStore } from "react";
import { Switch } from "@/shared/components/ui/switch";
import { es } from "@/shared/i18n/es";

const STORAGE_KEY = "reunioes-edit-mode";
const EVENT_NAME = "reunioes-edit-mode-change";

function readEditMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeEditMode(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  const onCustom = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onCustom);
  };
}

/** Lê o modo edição (persistido em localStorage, sobrevive à troca de abas). */
export function useReunioesEditMode(): boolean {
  return useSyncExternalStore(subscribeEditMode, readEditMode, () => false);
}

export function setReunioesEditMode(checked: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, checked ? "1" : "0");
  } catch {
    /* armazenamento indisponível: segue só em memória da sessão */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Ilha client mínima: switch no início da página para owner/admin.
 * O server decide quem vê (canManage); o estado vive no client.
 */
export function ReunioesEditModeToggle() {
  const editMode = useReunioesEditMode();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{es.modoEdicion}</p>
        <p className="text-xs text-muted-foreground">{es.modoEdicionHint}</p>
      </div>
      <Switch label={es.modoEdicion} checked={editMode} onCheckedChange={setReunioesEditMode} />
    </div>
  );
}
