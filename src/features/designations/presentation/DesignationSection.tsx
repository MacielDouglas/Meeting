"use client";

import { useState } from "react";
import {
  createDesignationSector,
  deleteDesignationSector,
  saveDesignationSlots,
  seedDefaultDesignationSectors,
  toggleDesignationSector,
  updateDesignationSectorPeopleCount,
} from "@/features/designations/application/actions";
import type { DesignationSectorItem } from "@/features/designations/application/queries";
import { Button } from "@/shared/components/ui/button";
import { Card, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";

function SlotsEditor({ sector }: { sector: DesignationSectorItem }) {
  const [value, setValue] = useState(sector.slots.map((s) => s.label).join(", "));
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const slots = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      await saveDesignationSlots({ sectorId: sector.id, slots });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">
        Plazas dentro del sector (ej.: Sector A, Sector B — o Cámara A, Cámara B). Separa con comas.
      </span>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ej.: Sector A, Sector B"
          className="h-10 flex-1 rounded-lg bg-background px-3 text-sm outline-none"
        />
        <Button variant="outline" disabled={pending} onClick={() => void handleSave()}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

function NewSectorForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [slots, setSlots] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createDesignationSector({
        name: name.trim(),
        peopleCount: peopleCount === "" ? null : Number(peopleCount),
        slots: slots
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      });
      if (result.ok) onDone();
      else setError(result.error ?? "No se pudo crear.");
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
        <span className="text-muted-foreground">Nombre del sector (ej.: Cámara)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
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
            className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Plazas (opcional)</span>
          <input
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
            placeholder="Cámara A, Cámara B"
            className="h-10 rounded-lg bg-background px-3 text-sm outline-none"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Crear sector
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function DesignationSection({ initial }: { initial: DesignationSectorItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const isPreview = initial.length > 0 && initial[0].id.startsWith("default-");

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <CardTitle>Designaciones — todas las reuniones</CardTitle>
        <p className="text-sm text-muted-foreground">
          Activa o desactiva sectores. Los sectores desactivados filtran las habilidades en el
          registro de Personas (ej.: desactivar Video oculta la opción Video). Acomodadores y
          Micrófono aceptan cantidad + plazas con nombre.
        </p>
        {isPreview && (
          <Button
            variant="outline"
            disabled={seeding}
            onClick={() => {
              setSeeding(true);
              void seedDefaultDesignationSectors().finally(() => setSeeding(false));
            }}
          >
            {seeding ? "Activando…" : "Activar sectores predeterminados"}
          </Button>
        )}
      </Card>

      {initial.map((sector) => (
        <Card key={sector.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">
                {sector.name}{" "}
                {sector.isDefault && (
                  <span className="text-xs font-normal text-muted-foreground">
                    (predeterminado)
                  </span>
                )}
              </p>
              {sector.slots.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Plazas: {sector.slots.map((s) => s.label).join(" · ")}
                </p>
              )}
            </div>
            <Switch
              label={`Activar ${sector.name}`}
              checked={sector.enabled}
              onCheckedChange={(checked) =>
                void toggleDesignationSector({ id: sector.id, enabled: checked })
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Personas:</span>
            <input
              type="number"
              min={1}
              max={50}
              defaultValue={sector.peopleCount ?? ""}
              placeholder="—"
              key={`${sector.id}-${sector.peopleCount}`}
              onBlur={(e) =>
                void updateDesignationSectorPeopleCount({
                  id: sector.id,
                  peopleCount: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="h-10 w-24 rounded-lg bg-secondary px-3 text-sm outline-none"
            />
          </label>

          <SlotsEditor sector={sector} />

          {!sector.isDefault && !sector.id.startsWith("default-") && (
            <button
              type="button"
              onClick={() => void deleteDesignationSector({ id: sector.id })}
              className="self-start text-xs font-medium text-danger"
            >
              Eliminar sector
            </button>
          )}
        </Card>
      ))}

      {showForm ? (
        <NewSectorForm onDone={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          + Nuevo sector (ej.: Cámara, 2 personas, Cámara A y B)
        </Button>
      )}
    </div>
  );
}
