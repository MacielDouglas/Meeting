// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  formatShortDay,
  formatWeekday,
  type MyWeek,
  type MyWeekMeeting,
} from "@/features/weekly-schedule/domain/my-week";
import { MyWeekSection } from "@/features/weekly-schedule/presentation/MyWeekSection";
import { es } from "@/shared/i18n/es";
import { todayLocalISO } from "@/shared/lib/format-date";

function isoInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayLocalISO(date);
}

function meeting(
  kind: MyWeekMeeting["kind"],
  date: string,
  extra: Partial<MyWeekMeeting> = {},
): MyWeekMeeting {
  return {
    kind,
    title: kind === "midweek" ? "Reunión entre semana" : "Reunión de fin de semana",
    date,
    time: kind === "midweek" ? "19:30" : "10:00",
    location: "Salón del Reino",
    isNext: kind === "midweek",
    parts: [],
    cleaning: [],
    duties: [],
    ...extra,
  };
}

function leadLabel(date: string, kind: MyWeekMeeting["kind"]): string {
  const kindName = kind === "midweek" ? es.entreSemana : es.finSemana;
  return `${kindName} ${formatWeekday(date)} ${formatShortDay(date)}`;
}

describe("MyWeekSection", () => {
  it("mostra partes, limpieza, apoyo y próxima reunión de la semana", () => {
    const midweekDate = isoInDays(2);
    const weekendDate = isoInDays(5);
    const myWeek: MyWeek = {
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      personName: "Antonio Pedro",
      isMale: true,
      meetings: [
        meeting("midweek", midweekDate, {
          parts: [
            {
              partKey: "ministry-0",
              section: "SEAMOS MEJORES MAESTROS",
              title: "Haga revisitas",
              durationMinutes: 4,
              songNumber: null,
              isHelper: false,
              personName: "Antonio Pedro",
              helperPersonName: "",
            },
            {
              partKey: "congregation-study",
              section: "NUESTRA VIDA CRISTIANA",
              title: "Estudio bíblico de la congregación",
              durationMinutes: 30,
              songNumber: null,
              isHelper: true,
              personName: "Luisa Gómez",
              helperPersonName: "Antonio Pedro",
            },
          ],
          cleaning: [{ assignmentDate: midweekDate, sectorName: "Auditorio", isFamily: false }],
          duties: [
            {
              assignmentDate: midweekDate,
              dutyKey: "sound",
              postLabel: "Rotador",
              side: "Norte",
              sortOrder: 0,
            },
          ],
        }),
        meeting("weekend", weekendDate),
      ],
      upcomingDuties: [
        {
          assignmentDate: weekendDate,
          dutyKey: "microphone",
          postLabel: "Púlpito",
          side: null,
          sortOrder: 1,
        },
      ],
    };

    render(<MyWeekSection myWeek={myWeek} canLinkAccount={false} />);

    expect(screen.getByRole("heading", { level: 1, name: es.miSemana })).toBeInTheDocument();
    expect(screen.getByText(es.eres)).toBeInTheDocument();
    expect(screen.getByText("Antonio Pedro")).toBeInTheDocument();

    const lead = screen.getByRole("region", { name: leadLabel(midweekDate, "midweek") });
    expect(within(lead).getByText(es.miParte)).toBeInTheDocument();
    expect(within(lead).getByText(/Haga revisitas/)).toBeInTheDocument();
    expect(within(lead).getByText(es.titular)).toBeInTheDocument();
    expect(within(lead).getByText(es.lector)).toBeInTheDocument();
    expect(within(lead).getByText(es.miAsignacion)).toBeInTheDocument();
    expect(within(lead).getByText(/Sonido/)).toBeInTheDocument();
    expect(within(lead).getByText(es.miLimpieza)).toBeInTheDocument();
    expect(within(lead).getByText("Auditorio")).toBeInTheDocument();
    expect(within(lead).queryByText(es.sinLimpieza)).not.toBeInTheDocument();

    expect(
      screen.getByText(`${formatWeekday(weekendDate)} ${formatShortDay(weekendDate)} · 10:00`),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: es.verProgramaCompleto })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: es.verDiseniosLimpieza })).toBeInTheDocument();

    const upcoming = screen.getByRole("region", { name: es.proximasEnLaReunion });
    expect(within(upcoming).getByText(/Micrófono/)).toBeInTheDocument();
  });

  it("muestra estados de ausencia cuando no hay designaciones", () => {
    const midweekDate = isoInDays(2);
    const myWeek: MyWeek = {
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      personName: "Antonio Pedro",
      isMale: true,
      meetings: [meeting("midweek", midweekDate)],
      upcomingDuties: [],
    };

    render(<MyWeekSection myWeek={myWeek} canLinkAccount={false} />);

    const lead = screen.getByRole("region", { name: leadLabel(midweekDate, "midweek") });
    expect(within(lead).getByText(es.sinParte)).toBeInTheDocument();
    expect(within(lead).getByText(es.sinAsignar)).toBeInTheDocument();
    expect(within(lead).getByText(es.sinLimpieza)).toBeInTheDocument();
    expect(screen.queryByText(es.semanaVacia)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: es.proximasEnLaReunion })).not.toBeInTheDocument();
  });

  it("muestra semana vacía sin persona vinculada pidiendo vínculo al admin", () => {
    const myWeek: MyWeek = {
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      personName: null,
      isMale: false,
      meetings: [],
      upcomingDuties: [],
    };

    render(<MyWeekSection myWeek={myWeek} canLinkAccount={false} />);

    expect(screen.getByText(es.usuarioNoVinculado, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(es.pideAdminVinculo, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(es.semanaVacia)).toBeInTheDocument();
    expect(screen.queryByText(es.vincularEnPersonas)).not.toBeInTheDocument();
    expect(screen.queryByText(es.miParte)).not.toBeInTheDocument();
  });

  it("ofrece vínculo directo en Personas a owner o admin", () => {
    const myWeek: MyWeek = {
      weekStart: "2026-09-21",
      weekEnd: "2026-09-27",
      personName: null,
      isMale: false,
      meetings: [],
      upcomingDuties: [],
    };

    render(<MyWeekSection myWeek={myWeek} canLinkAccount />);

    expect(screen.getByRole("link", { name: es.vincularEnPersonas })).toHaveAttribute(
      "href",
      "/personas",
    );
    expect(screen.queryByText(es.pideAdminVinculo)).not.toBeInTheDocument();
  });
});
