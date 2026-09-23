"use client";

import { type ComponentType, useState } from "react";
import { FaChair, FaDoorOpen, FaToilet, FaTrashAlt } from "react-icons/fa";
import { FaToiletPaper } from "react-icons/fa6";
import {
  GiBrickWall,
  GiBroom,
  GiGrass,
  GiSpiderWeb,
  GiSpikedFence,
  GiWindow,
} from "react-icons/gi";
import { IoWalkSharp } from "react-icons/io5";
import {
  MdLocalLaundryService,
  MdOutlineCleaningServices,
  MdTableBar,
  MdUmbrella,
} from "react-icons/md";
import { PiFanLight, PiMicrophoneStageFill } from "react-icons/pi";
import {
  createCleaningSector,
  deleteCleaningSector,
  restoreDefaultCleaningSectors,
  toggleCleaningSector,
  toggleCleaningType,
  updateCleaningSector,
} from "@/features/cleaning/application/actions";
import type { CleaningSectorItem, CleaningTypeItem } from "@/features/cleaning/application/queries";
import type { CleaningTypeKey, RequiredSex } from "@/features/cleaning/domain/cleaning-defaults";
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
import { Switch } from "@/shared/components/ui/switch";

const SEX_OPTIONS: { value: RequiredSex; label: string }[] = [
  { value: "any", label: "Cualquiera" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
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
    allowYoung: boolean;
  };
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [task, setTask] = useState(initial?.task ?? "");
  const [peopleCount, setPeopleCount] = useState(
    initial?.peopleCount != null ? String(initial.peopleCount) : "",
  );
  const [requiredSex, setRequiredSex] = useState<RequiredSex>(initial?.requiredSex ?? "any");
  const [allowYoung, setAllowYoung] = useState(initial?.allowYoung ?? true);
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
        allowYoung,
      };
      const result = initial
        ? await updateCleaningSector({ id: initial.id, ...payload })
        : await createCleaningSector(payload);
      if (result.ok) {
        onDone();
      } else {
        setError(result.error ?? "No se pudo guardar.");
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Nombre del sector</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="h-10 rounded-lg bg-background px-3 text-sm outline-none focus:border focus:border-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Tarea</span>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          className="rounded-lg bg-background px-3 py-2 text-sm outline-none focus:border focus:border-ring"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Personas (opcional)</span>
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
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-muted-foreground">Permite joven</span>
        <Switch label="Permite joven" checked={allowYoung} onCheckedChange={setAllowYoung} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {initial ? "Guardar" : "Añadir sector"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function sexLabel(sex: RequiredSex): string {
  if (sex === "male") return "Sexo: masculino";
  if (sex === "female") return "Sexo: femenino";
  return "Sexo: cualquiera";
}

function youngLabel(allowYoung: boolean): string {
  return allowYoung ? "Joven: sí" : "Solo adulto";
}

const SECTOR_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  "per_meeting:auditorio": GiBroom,
  "per_meeting:banheiro_masculino": FaToilet,
  "per_meeting:banheiro_feminino": FaToilet,
  "per_meeting:abastecimento": FaToiletPaper,
  "per_meeting:recolher_lixo": FaTrashAlt,
  "weekly:teia_de_aranha": GiSpiderWeb,
  "weekly:auditorio": GiBroom,
  "weekly:portas_e_janelas": FaDoorOpen,
  "weekly:moveis": MdTableBar,
  "weekly:microfones": PiMicrophoneStageFill,
  "weekly:cadeiras": FaChair,
  "weekly:calcadas": IoWalkSharp,
  "weekly:lavanderia": MdLocalLaundryService,
  "weekly:objetos": MdUmbrella,
  "general:paredes": GiBrickWall,
  "general:janelas": GiWindow,
  "general:ventiladores": PiFanLight,
  "general:banheiros": FaToilet,
  "general:grades": GiSpikedFence,
  "general:jardim": GiGrass,
  "general:calcadas": IoWalkSharp,
  "general:sala_de_limpeza": MdOutlineCleaningServices,
};

function SectorIcon({
  typeKey,
  sectorKey,
}: {
  typeKey: CleaningTypeKey;
  sectorKey: string | null;
}) {
  const Icon = (sectorKey && SECTOR_ICONS[`${typeKey}:${sectorKey}`]) || GiBroom;
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-accent"
    >
      <Icon size={20} />
    </span>
  );
}

function SectorModal({
  typeKey,
  sector,
  onClose,
}: {
  typeKey: CleaningTypeKey;
  sector: CleaningSectorItem;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    const result = await deleteCleaningSector({ id: sector.id });
    if (result.ok) onClose();
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
          <AlertDialogTitle className="flex items-center gap-3">
            <SectorIcon typeKey={typeKey} sectorKey={sector.key} />
            {sector.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {sector.peopleCount != null ? `${sector.peopleCount} persona(s)` : "Cant. libre"}
            {" · "}
            {sexLabel(sector.requiredSex)}
            {" · "}
            {youngLabel(sector.allowYoung)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {editing ? (
          <SectorForm
            typeKey={typeKey}
            initial={{
              id: sector.id,
              name: sector.name,
              task: sector.task,
              peopleCount: sector.peopleCount,
              requiredSex: sector.requiredSex,
              allowYoung: sector.allowYoung,
            }}
            onDone={() => setEditing(false)}
          />
        ) : confirmingDelete ? (
          <p className="text-sm">
            Eliminar el sector “{sector.name}”? Esta acción no se puede deshacer.
          </p>
        ) : (
          <p className="text-sm">{sector.task || "Sin tarea registrada."}</p>
        )}
        <AlertDialogFooter className="flex-col sm:flex-row">
          {!editing && !confirmingDelete && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button
                className="border-transparent bg-danger text-danger-ink"
                onClick={() => setConfirmingDelete(true)}
              >
                Eliminar
              </Button>
            </>
          )}
          {confirmingDelete && (
            <Button
              className="border-transparent bg-danger text-danger-ink"
              onClick={() => void handleDelete()}
            >
              Confirmar eliminación
            </Button>
          )}
          {confirmingDelete ? (
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Volver
            </Button>
          ) : (
            !editing && <AlertDialogCancel>Cancelar</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CleaningSection({ initial }: { initial: CleaningTypeItem[] }) {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<CleaningTypeKey | null>(null);
  const [selected, setSelected] = useState<{
    typeKey: CleaningTypeKey;
    sector: CleaningSectorItem;
  } | null>(null);

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
              label={`Activar ${cleaning.label}`}
              checked={cleaning.enabled}
              onCheckedChange={(checked) =>
                void toggleCleaningType({ key: cleaning.key, enabled: checked })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            {cleaning.sectors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ningún sector. Añade abajo o restaura los predeterminados.
              </p>
            )}
            {cleaning.sectors.map((sector) => (
              <div key={sector.id} className="rounded-xl bg-secondary p-3">
                <div className="flex items-center gap-3">
                  <SectorIcon typeKey={cleaning.key} sectorKey={sector.key} />
                  <button
                    type="button"
                    onClick={() => setSelected({ typeKey: cleaning.key, sector })}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
                  >
                    {sector.name}{" "}
                    {sector.isDefault && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (predeterminado)
                      </span>
                    )}
                  </button>
                  <Switch
                    label={`Activar sector ${sector.name}`}
                    checked={sector.enabled}
                    onCheckedChange={(checked) =>
                      void toggleCleaningSector({ id: sector.id, enabled: checked })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelected({ typeKey: cleaning.key, sector })}
                  className="mt-1 block w-full pl-[52px] text-left"
                >
                  <span className="block text-sm text-muted-foreground">{sector.task}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {sector.peopleCount != null
                      ? `${sector.peopleCount} persona(s)`
                      : "Cant. libre"}
                    {" · "}
                    {sexLabel(sector.requiredSex)}
                    {" · "}
                    {youngLabel(sector.allowYoung)}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {showForm === cleaning.key ? (
            <SectorForm typeKey={cleaning.key} onDone={() => setShowForm(null)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowForm(cleaning.key)}>
                + Nuevo sector
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
                {restoring === cleaning.key ? "Restaurando…" : "Recuperar sectores predeterminados"}
              </Button>
            </div>
          )}
        </Card>
      ))}
      {selected && (
        <SectorModal
          typeKey={selected.typeKey}
          sector={
            initial
              .find((cleaning) => cleaning.key === selected.typeKey)
              ?.sectors.find((sector) => sector.id === selected.sector.id) ?? selected.sector
          }
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
