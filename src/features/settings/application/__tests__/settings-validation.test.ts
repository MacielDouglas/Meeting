import { describe, expect, it } from "vitest";
import {
  createScheduleExceptionSchema,
  createSpecialEventSchema,
  deleteRecordSchema,
  meetingScheduleSchema,
} from "@/features/settings/application/settings-validation";

const validSchedule = {
  congregationName: "Cong. Centro",
  midweekDay: 3,
  midweekTime: "20:00",
  weekendDay: 0,
  weekendTime: "10:00",
};

const validEvent = {
  type: "memorial",
  title: "Celebración del Memorial",
  startDate: "2026-10-04",
  startTime: "10:00",
};

describe("meetingScheduleSchema", () => {
  it("aceita un horario completo válido", () => {
    const result = meetingScheduleSchema.safeParse(validSchedule);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(validSchedule);
  });

  it("aceita sin nombre de congregación", () => {
    const result = meetingScheduleSchema.safeParse({
      midweekDay: 3,
      midweekTime: "20:00",
      weekendDay: 0,
      weekendTime: "10:00",
    });
    expect(result.success).toBe(true);
  });

  it("recorta espacios alrededor de la hora", () => {
    const result = meetingScheduleSchema.safeParse({ ...validSchedule, midweekTime: " 20:00 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.midweekTime).toBe("20:00");
  });

  it("rechaza hora fuera del formato HH:MM", () => {
    const result = meetingScheduleSchema.safeParse({ ...validSchedule, midweekTime: "21:30hs" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Hora no válida (HH:MM)");
      expect(result.error.issues[0]?.path).toEqual(["midweekTime"]);
    }
  });

  it("rechaza día fuera del rango 0..6", () => {
    const result = meetingScheduleSchema.safeParse({ ...validSchedule, weekendDay: 7 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["weekendDay"]);
  });

  it("rechaza HTML en el nombre de la congregación", () => {
    const result = meetingScheduleSchema.safeParse({
      ...validSchedule,
      congregationName: "Cong <b>Final</b>",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("HTML no permitido");
  });
});

describe("createSpecialEventSchema", () => {
  it("aceita evento con fecha de fin igual al inicio", () => {
    const result = createSpecialEventSchema.safeParse({ ...validEvent, endDate: "2026-10-04" });
    expect(result.success).toBe(true);
  });

  it("aceita evento sin fecha de fin", () => {
    const result = createSpecialEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.endDate).toBeUndefined();
  });

  it("rechaza fin anterior al inicio", () => {
    const result = createSpecialEventSchema.safeParse({
      ...validEvent,
      endDate: "2026-10-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("La fecha de fin debe ser posterior al inicio.");
      expect(result.error.issues[0]?.path).toEqual(["endDate"]);
    }
  });

  it("rechaza hora de inicio inválida", () => {
    const result = createSpecialEventSchema.safeParse({ ...validEvent, startTime: "9:00" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Hora no válida (HH:MM)");
  });
});

describe("createScheduleExceptionSchema", () => {
  it("aceita una excepción válida", () => {
    const input = { type: "no_meeting", date: "2026-11-01", notes: "Sin reunión por feriado" };
    const result = createScheduleExceptionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(input);
  });

  it("rechaza fecha con formato distinto de AAAA-MM-DD", () => {
    const result = createScheduleExceptionSchema.safeParse({
      type: "no_meeting",
      date: "04/10/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Fecha no válida (YYYY-MM-DD)");
      expect(result.error.issues[0]?.path).toEqual(["date"]);
    }
  });

  it("rechaza tipo fuera del catálogo", () => {
    const result = createScheduleExceptionSchema.safeParse({
      type: "cualquiera",
      date: "2026-11-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["type"]);
  });
});

describe("deleteRecordSchema", () => {
  it("recorta el id", () => {
    const result = deleteRecordSchema.safeParse({ id: "  ev-1  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("ev-1");
  });

  it("rechaza id vacío", () => {
    const result = deleteRecordSchema.safeParse({ id: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["id"]);
  });

  it("rechaza id más largo que 64 caracteres", () => {
    const result = deleteRecordSchema.safeParse({ id: "a".repeat(65) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["id"]);
  });
});
