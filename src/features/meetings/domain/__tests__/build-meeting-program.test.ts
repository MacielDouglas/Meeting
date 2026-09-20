import { describe, expect, it } from "vitest";
import {
  addMinutes,
  buildMidweekParts,
  buildWeekendParts,
  extractSongNumber,
  parseDurationMinutes,
} from "@/features/meetings/domain/build-meeting-program";

describe("build-meeting-program", () => {
  it("extrai número do cântico e duração", () => {
    expect(extractSongNumber("Canción 12")).toBe(12);
    expect(extractSongNumber("Cântico 156 y oración")).toBe(156);
    expect(parseDurationMinutes("(10 mins.)", 4)).toBe(10);
    expect(parseDurationMinutes(undefined, 5)).toBe(5);
  });

  it("soma minutos no relógio", () => {
    expect(addMinutes("19:00", 5)).toBe("19:05");
    expect(addMinutes("19:55", 10)).toBe("20:05");
  });

  it("monta entre semana com relógio 19:00 -> 20:45", () => {
    const songs = new Map([
      [12, "Jehová, nuestro gran Dios"],
      [3, "Tú me das fuerza"],
      [156, "Si tienes fe"],
    ]);
    const parts = buildMidweekParts(
      {
        meeting: {
          song: [
            { openingSong: "Canción 12", middleSong: "Canción 3", closingSong: "Canción 156" },
          ],
          BibleReading: "JEREMÍAS 29,30",
          "TREASURES FROM GODS WORD": [
            { title: "Jehová disciplina", duration: "(10 mins.)" },
            { title: "Busquemos perlas escondidas", duration: "(10 mins.)" },
            { title: "Lectura de la Biblia", duration: "(4 mins.)" },
          ],
          "APPLY YOURSELF TO THE FIELD MINISTRY": [
            { title: "Empiece conversaciones", duration: "(5 mins.)" },
            { title: "Empiece conversaciones", duration: "(5 mins.)" },
            { title: "Discurso", duration: "(4 mins.)" },
          ],
          "LIVING AS CHRISTIANS": [
            { title: "Jehová llena de esperanza", duration: "(10 mins.)" },
            { title: "Campaña especial", duration: "(5 mins.)" },
            { title: "Estudio bíblico de la congregación", duration: "(30 mins.)" },
          ],
        },
      },
      "19:00",
      songs,
    );
    expect(parts[0].startTime).toBe("19:00");
    expect(parts[1].startTime).toBe("19:05");
    expect(parts[2].startTime).toBe("19:06");
    // cântico do meio após tesouros (6) + ministério (5+1,5+1,4+1=17) = 19:06+25=19:31? +? verifica ordem
    const middle = parts.find((p) => p.key === "middle-song");
    expect(middle?.songNumber).toBe(3);
    expect(middle?.songTheme).toBe("Tú me das fuerza");
    const closing = parts.find((p) => p.key === "closing-song");
    expect(closing?.songNumber).toBe(156);
    const last = parts[parts.length - 1];
    // 19:00 + 5 + 1 + (10+10+4+1) + (5+1 + 5+1 + 4+1) + 5 + (10+5) + 30 + 3 = 20:41
    expect(last.startTime).toBe("20:41");
    expect(addMinutes(last.startTime, last.durationMinutes)).toBe("20:46");
  });

  it("monta fim de semana 9:00 -> 10:45", () => {
    const songs = new Map([
      [12, "Tema 12"],
      [90, "Animémonos unos a otros"],
      [124, "Siempre fieles"],
    ]);
    const parts = buildWeekendParts(
      "09:00",
      12,
      "Mire al futuro sin miedo",
      108,
      { title: "Cómo seguir siendo amigos", openingSong: 90, closingSong: 124 },
      songs,
    );
    expect(parts.map((p) => p.startTime)).toEqual([
      "09:00",
      "09:05",
      "09:05",
      "09:35",
      "09:40",
      "10:40",
    ]);
    expect(parts.find((p) => p.key === "weekend-chairman")?.capability).toBe("weekendPresident");
    expect(parts[3].songTheme).toBe("Animémonos unos a otros");
    expect(parts[5].songTheme).toBe("Siempre fieles");
    expect(addMinutes(parts[5].startTime, parts[5].durationMinutes)).toBe("10:45");
  });
});
