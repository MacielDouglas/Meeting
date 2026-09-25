import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSON_FORM,
  normalizePersonValues,
  type PersonFormValues,
  personFormSchema,
  updatePersonSchema,
  updateUserRoleSchema,
} from "@/features/people/application/person-validation";
import {
  FEMALE_RESTRICTED_KEYS,
  MEETING_PART_KEYS,
  SERVICE_PRIVILEGE_KEYS,
} from "@/features/people/domain/person";

function validForm(overrides: Partial<PersonFormValues> & { id?: string } = {}): PersonFormValues {
  return { ...DEFAULT_PERSON_FORM, firstName: "Ana", lastName: "Pérez", ...overrides };
}

describe("personFormSchema", () => {
  it("acepta el formulario por defecto con nombre", () => {
    const parsed = personFormSchema.safeParse(validForm());

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.firstName).toBe("Ana");
    expect(parsed.data.unavailableNotes).toBe("");
  });

  it("recorta los espacios del nombre", () => {
    const parsed = personFormSchema.safeParse(validForm({ firstName: "  Ana  " }));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.firstName).toBe("Ana");
  });

  it("rechaza HTML en el nombre", () => {
    const parsed = personFormSchema.safeParse(validForm({ firstName: "<b>Ana</b>" }));

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((issue) => issue.message === "HTML no permitido")).toBe(true);
  });

  it("rechaza el nombre vacío", () => {
    expect(personFormSchema.safeParse(validForm({ firstName: "" })).success).toBe(false);
  });

  it("rechaza el nombre mayor que 80 caracteres", () => {
    expect(personFormSchema.safeParse(validForm({ firstName: "a".repeat(81) })).success).toBe(
      false,
    );
  });

  it("rechaza un sexo fuera del enum", () => {
    const parsed = personFormSchema.safeParse(
      validForm({ sex: "otro" as unknown as PersonFormValues["sex"] }),
    );

    expect(parsed.success).toBe(false);
  });

  it("rechaza campos booleanos con texto", () => {
    const parsed = personFormSchema.safeParse(validForm({ cleaning: "sí" as unknown as boolean }));

    expect(parsed.success).toBe(false);
  });

  it("rellena unavailableNotes vacío cuando no viene en la entrada", () => {
    const { unavailableNotes, ...rest } = validForm();
    const parsed = personFormSchema.safeParse(rest);

    expect(unavailableNotes).toBe("");
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.unavailableNotes).toBe("");
  });

  it("rechaza unavailableNotes mayor que 300 caracteres", () => {
    expect(
      personFormSchema.safeParse(validForm({ unavailableNotes: "x".repeat(301) })).success,
    ).toBe(false);
  });

  it("permite familyMemberId nulo pero rechaza el vacío", () => {
    expect(personFormSchema.safeParse(validForm({ familyMemberId: null })).success).toBe(true);
    expect(personFormSchema.safeParse(validForm({ familyMemberId: "" })).success).toBe(false);
  });
});

describe("updatePersonSchema", () => {
  it("requiere el id de la persona", () => {
    expect(updatePersonSchema.safeParse(validForm()).success).toBe(false);
  });

  it("acepta el id junto al formulario", () => {
    const parsed = updatePersonSchema.safeParse(validForm({ id: "p1" }));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.id).toBe("p1");
  });

  it("recorta el id", () => {
    const parsed = updatePersonSchema.safeParse(validForm({ id: "  p1  " }));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.id).toBe("p1");
  });
});

describe("updateUserRoleSchema", () => {
  it("aceita los roles válidos", () => {
    for (const role of ["admin", "member"] as const) {
      expect(updateUserRoleSchema.safeParse({ userId: "u2", role }).success).toBe(true);
    }
  });

  it("rechaza owner por dropdown (titularidade fora deste fluxo)", () => {
    expect(updateUserRoleSchema.safeParse({ userId: "u2", role: "owner" }).success).toBe(false);
  });

  it("rechaza un rol desconocido", () => {
    const parsed = updateUserRoleSchema.safeParse({ userId: "u2", role: "superuser" });

    expect(parsed.success).toBe(false);
  });

  it("requiere el userId", () => {
    expect(updateUserRoleSchema.safeParse({ role: "admin" }).success).toBe(false);
  });
});

describe("normalizePersonValues", () => {
  it("limpa las funciones reservadas de la mujer", () => {
    const normalized = normalizePersonValues(
      validForm({
        sex: "female",
        baptized: true,
        prayer: true,
        elder: true,
        publicTalk: true,
        familyHead: false,
        familyMemberId: "p9",
      }),
    );

    for (const key of FEMALE_RESTRICTED_KEYS) {
      expect(normalized[key]).toBe(false);
    }
    expect(normalized.familyMemberId).toBe("p9");
  });

  it("limpa los privilegios de servicio sin bautismo", () => {
    const normalized = normalizePersonValues(
      validForm({
        sex: "male",
        baptized: false,
        prayer: true,
        studyReader: true,
        elder: true,
      }),
    );

    for (const key of SERVICE_PRIVILEGE_KEYS) {
      expect(normalized[key]).toBe(false);
    }
    expect(normalized.helper).toBe(true);
  });

  it("limpa las partes de la reunión sin cargo", () => {
    const normalized = normalizePersonValues(
      validForm({
        sex: "male",
        baptized: true,
        elder: false,
        ministerialServant: false,
        publicTalk: true,
        treasuresTalk: true,
      }),
    );

    for (const key of MEETING_PART_KEYS) {
      expect(normalized[key]).toBe(false);
    }
  });

  it("conserva las partes de la reunión con cargo", () => {
    const normalized = normalizePersonValues(
      validForm({
        sex: "male",
        baptized: true,
        elder: true,
        publicTalk: true,
        studyReader: true,
      }),
    );

    expect(normalized.publicTalk).toBe(true);
    expect(normalized.studyReader).toBe(true);
  });

  it("limpia familyMemberId al ser cabeza de familia", () => {
    const normalized = normalizePersonValues(validForm({ familyHead: true, familyMemberId: "p9" }));

    expect(normalized.familyMemberId).toBeNull();
  });
});
