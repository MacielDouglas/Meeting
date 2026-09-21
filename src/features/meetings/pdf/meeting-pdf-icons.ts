import type { jsPDF } from "jspdf";
import type { MeetingPdfSectionKey } from "./meeting-pdf-types";

export type SectionIconKey = MeetingPdfSectionKey;

/**
 * Ícones exatos das seções, com path data copiado verbatim dos pacotes
 * react-icons (renderizados via react-dom/server para extração fiel):
 * - bibleTreasures: IoDiamondSharp (Ionicons, viewBox 512, preenchido)
 * - applyYourself: LuWheat (Lucide, viewBox 24, traço, stroke-width 2)
 * - christianLife: GiSheep (Game Icons, viewBox 512, preenchido)
 *
 * O jsPDF não renderiza componentes React/SVG, então os paths são
 * convertidos para segmentos relativos (linha/bezier cúbica) e desenhados
 * com `pdf.lines()`, preservando a geometria original.
 */

type IconPaint = "fill" | "stroke";

type SectionIconDef = {
  viewBox: number;
  paint: IconPaint;
  strokeWidth: number;
  paths: string[];
};

const SECTION_ICONS: Record<SectionIconKey, SectionIconDef> = {
  bibleTreasures: {
    viewBox: 512,
    paint: "fill",
    strokeWidth: 0,
    paths: [
      "M396.31 32H264l84.19 112.26zm-280.62 0 48.12 112.26L248 32zM256 74.67 192 160h128zm166.95-23.61L376.26 160H488zm-333.9 0L23 160h112.74zM146.68 192H24l222.8 288h.53zm218.64 0L264.67 480h.53L488 192zm-35.93 0H182.61L256 400z",
    ],
  },
  applyYourself: {
    viewBox: 24,
    paint: "stroke",
    strokeWidth: 2,
    paths: [
      "M2 22 16 8",
      "M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
      "M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
      "M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z",
      "M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z",
      "M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
      "M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
      "M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z",
    ],
  },
  publicTalk: {
    viewBox: 48,
    paint: "fill",
    strokeWidth: 0,
    paths: [
      "M24 28c3.31 0 5.98-2.69 5.98-6L30 10c0-3.32-2.68-6-6-6-3.31 0-6 2.68-6 6v12c0 3.31 2.69 6 6 6zm10.6-6c0 6-5.07 10.2-10.6 10.2-5.52 0-10.6-4.2-10.6-10.2H10c0 6.83 5.44 12.47 12 13.44V42h4v-6.56c6.56-.97 12-6.61 12-13.44h-3.4z",
    ],
  },
  watchtowerStudy: {
    viewBox: 48,
    paint: "fill",
    strokeWidth: 0,
    paths: [
      "M43.98 8c0-2.21-1.77-4-3.98-4H8C5.79 4 4 5.79 4 8v24c0 2.21 1.79 4 4 4h28l8 8-.02-36zM36 28H12v-4h24v4zm0-6H12v-4h24v4zm0-6H12v-4h24v4z",
    ],
  },
  christianLife: {
    viewBox: 512,
    paint: "fill",
    strokeWidth: 0,
    paths: [
      "M392.8 107.5c9.3 5.3 25.8 9.3 40 9.2 7.7-.1 14.6-1.2 19.5-3.2 5-1.8 6.9-4.9 8.9-8.8-9.2-6.08-22.1-12.27-31.8-12.87-14.9.53-28.8 8.13-36.6 15.67zm-253 20.2c-1.7 5.5-7.9 8.1-13 5.4-26.5-14.5-50.46-6.9-67.71 8.7-35.93 32.6-45.13 87.3-32.47 145.7 7.31 33.6 18.99 53 41.29 62.8 0 .1.1.1.15.1 2.22 1 4.21 1.9 6.09 2.8l4.61-22c1.02-4.9 5.8-8 10.66-7s7.98 5.8 6.96 10.7l-23.5 112c4.79 7.2 16.4 1.2 21.3-1.2l38.12-106.5c10.8-9.4 21.2-19 28.7-29.2 6.6-9.1 10.4-18.4 10.6-23.5.2-5 4.4-8.9 9.4-8.7 5 .2 9 4.6 8.6 9.6-.6 11.2-6.2 22.4-14 33.2-7.3 10-16.7 19.6-27.2 27.2l-3.3 8.9c6.9 8.7 13.4 13.8 19.6 16.8 8.8 4.1 17.7 4.6 28.5 3.3 16.4-1.9 34.6-12.9 43.5-37.2 2.8-7.7 13.6-8 16.8-.5 7.7 21.2 36.1 32.6 55.1 24l-3.9-23.3c-.8-4.9 2.5-9.6 7.4-10.4 4.9-.9 9.6 2.5 10.4 7.4l17.6 105.9c9.2 6.3 14.5 2.4 19.9-4.4l-13.8-114.4c-.7-5.3 3.3-10 8.6-10.2 4.8-.2 8.8 3.3 9.3 8l4.3 35.7c5.1-1.2 9.1-2.5 12.4-5 4.3-3.2 8.5-8.7 12.1-21.5 1.7-6 9-8.5 14.1-4.7 13.6 8.3 27.4-1.8 35.6-12.2 12.9-16.5 14.7-42.4 13.2-69.2-2.1.3-4.2.5-6.3.6-8.8.5-17.9-.9-25.7-4.4-12.4-7-22-18.4-28.2-28.9-3.9-6.8-7.3-13.7-10.5-20-5.4 9.9-11 23.1-19.2 25-12.5 2.1-23.9-3.7-29.8-12.7-5.9-8.9-7.4-20.2-4.8-31.1 2.7-11.7 9.8-38.3 22.6-56.1 2.2-2.9 4.5-5.3 6.8-7.4-7.5-3.1-16.2-3.8-22.9-3.8-5.8 0-13.5 1.8-19.7 5-6.2 3.3-10.7 7.8-12.2 11.8-3.2 8.5-15.5 7.5-17.3-1.3-3.8-22.78-53.9-17.8-65.6 2-3.8 7-14.1 5.9-16.5-1.7-8.1-22.61-62.7-21.3-66.7 5.9zm345-1.5c1.7 16.4 3.5 32.2 4.2 45.6 1.8 6.5 6 18.9 8.7 7.3.9-4.1.8-11-.4-18.6-.1-7.1-14.5-47.3-12.5-34.3zm-112.7-2.5c-11.9 15-19.2 37.4-23.3 53.7-.6 5.8-.6 12.6 2.3 17.1 2.3 3.4 4.8 5.2 9.4 5 5.8-9.4 12.1-19.8 15.6-28.2-1.2-7.9-2.8-19.9-3.6-31.4-.4-5.8-.6-11.2-.4-16.2zm94.4 2.4c-2.4 1.6-4.8 3.1-7.5 4.1-7.8 3.2-16.8 4.4-26 4.5-14.8.1-30.2-2.7-42.9-8.4 0 3.6.1 7.7.4 12.3.9 12.6 3 27.2 4 33.5 10.5 16.6 19.9 44.4 36.8 52.5 5.8 2 11.9 3.1 17.2 2.9 6-.4 10.6-2.6 11.5-3.7 3.5-8 5.9-15.2 7.3-22.3 2.1-10.9 3.4-23.3 3.6-31.6.3-6.4-.6-13.3-1.1-18.7-1.4 4.1-5.7 6.6-10 5.9-4.3-.7-7.5-4.4-7.5-8.8 0-5.1 4.2-9.2 9.3-9 3 0 5.8 1.7 7.4 4.3-.9-6.1-1.4-12-2.5-17.5zm-58.3 16.5c4.9.2 8.7 4.2 8.7 9 0 5-4 9-9 9-4.9 0-9-4-9-9s4.2-9.1 9.3-9zm47.5 48.3c3.7-.1 6.5 1.9 6.5 6.2 0 7.8-5.8 15-12.7 19l-1-23.1c2.5-1.4 5-2.1 7.2-2.1zm-24.1 2c1.8-.1 3.9.4 5.8 1.3l3.8 22.5c-6-3.7-15.4-3.6-16.5-16.1-.5-5.2 2.8-7.7 6.9-7.7zm-30.9 164.2c-3.7 5.1-7.6 9.1-12.6 12.1l16.6 62c7.6 1.5 15.9 1 19.2-5.1zm-241.2 33.7l1.5 46.8c7.9 7.9 12.9 4.8 19.7-3l-3.7-39.5c-6.3-.9-12.6-2.2-17.5-4.3z",
    ],
  },
};

type PathLeg = number[];

type PathSubpath = {
  startX: number;
  startY: number;
  legs: PathLeg[];
  closed: boolean;
};

const PARAM_COUNTS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};
function tokenizePathData(value: string): string[] {
  const pattern = /[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

  return [...value.matchAll(pattern)].map((match) => match[0]);
}

function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  phiDeg: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number,
): number[][] {
  const phi = ((phiDeg % 360) * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  let rrx = Math.abs(rx);
  let rry = Math.abs(ry);

  const lambda = (x1p * x1p) / (rrx * rrx) + (y1p * y1p) / (rry * rry);

  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rrx *= scale;
    rry *= scale;
  }

  const sign = largeArc === sweep ? -1 : 1;
  const numerator = rrx * rrx * rry * rry - rrx * rrx * y1p * y1p - rry * rry * x1p * x1p;
  const denominator = rrx * rrx * y1p * y1p + rry * rry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = (coef * rrx * y1p) / rry;
  const cyp = (-coef * rry * x1p) / rrx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const vectorAngle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const length = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let angle = Math.acos(Math.min(1, Math.max(-1, dot / length)));

    if (ux * vy - uy * vx < 0) {
      angle = -angle;
    }

    return angle;
  };

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rrx, (y1p - cyp) / rry);
  let delta = vectorAngle(
    (x1p - cxp) / rrx,
    (y1p - cyp) / rry,
    (-x1p - cxp) / rrx,
    (-y1p - cyp) / rry,
  );
  delta = delta % (Math.PI * 2);

  if (sweep === 0 && delta > 0) {
    delta -= Math.PI * 2;
  }

  if (sweep === 1 && delta < 0) {
    delta += Math.PI * 2;
  }

  const pointAt = (theta: number): [number, number] => [
    cx + rrx * cosPhi * Math.cos(theta) - rry * sinPhi * Math.sin(theta),
    cy + rrx * sinPhi * Math.cos(theta) + rry * cosPhi * Math.sin(theta),
  ];

  const derivativeAt = (theta: number): [number, number] => [
    -rrx * cosPhi * Math.sin(theta) - rry * sinPhi * Math.cos(theta),
    -rrx * sinPhi * Math.sin(theta) + rry * cosPhi * Math.cos(theta),
  ];

  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const result: number[][] = [];

  for (let index = 0; index < segments; index += 1) {
    const t1 = theta1 + (delta * index) / segments;
    const t2 = theta1 + (delta * (index + 1)) / segments;
    const alpha = (4 / 3) * Math.tan((t2 - t1) / 4);

    const [p1x, p1y] = pointAt(t1);
    const [p2x, p2y] = pointAt(t2);
    const [d1x, d1y] = derivativeAt(t1);
    const [d2x, d2y] = derivativeAt(t2);

    result.push([
      p1x + alpha * d1x,
      p1y + alpha * d1y,
      p2x - alpha * d2x,
      p2y - alpha * d2y,
      p2x,
      p2y,
    ]);
  }

  return result;
}

export function parseSvgPathData(value: string): PathSubpath[] {
  const tokens = tokenizePathData(value);
  const subpaths: PathSubpath[] = [];

  let index = 0;
  let command = "";
  let currentX = 0;
  let currentY = 0;
  let subpathStartX = 0;
  let subpathStartY = 0;
  let previousCubicX2 = 0;
  let previousCubicY2 = 0;
  let previousQuadX = 0;
  let previousQuadY = 0;
  let previousCommand = "";
  let current: PathSubpath | null = null;

  const startSubpath = (x: number, y: number): PathSubpath => {
    const subpath: PathSubpath = {
      startX: x,
      startY: y,
      legs: [],
      closed: false,
    };
    subpaths.push(subpath);
    subpathStartX = x;
    subpathStartY = y;
    currentX = x;
    currentY = y;

    return subpath;
  };

  const pushLine = (x: number, y: number) => {
    if (!current) {
      current = startSubpath(currentX, currentY);
    }

    current.legs.push([x - currentX, y - currentY]);
    currentX = x;
    currentY = y;
  };

  const pushCubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    if (!current) {
      current = startSubpath(currentX, currentY);
    }

    current.legs.push([
      x1 - currentX,
      y1 - currentY,
      x2 - currentX,
      y2 - currentY,
      x - currentX,
      y - currentY,
    ]);
    currentX = x;
    currentY = y;
    previousCubicX2 = x2;
    previousCubicY2 = y2;
  };

  while (index < tokens.length) {
    const token = tokens[index];

    if (token !== undefined && /^[MmLlHhVvCcSsQqTtAaZz]$/.test(token)) {
      command = token;
      index += 1;

      if (command === "Z" || command === "z") {
        if (current) {
          current.closed = true;
        }

        currentX = subpathStartX;
        currentY = subpathStartY;
        previousCommand = command;
        continue;
      }

      if (command === "M" || command === "m") {
        previousCommand = command;
      }

      continue;
    }

    if (!command) {
      index += 1;
      continue;
    }

    const upper = command.toUpperCase();
    const relative = command !== upper;
    const paramCount = PARAM_COUNTS[upper] ?? 0;

    if (paramCount === 0 || index + paramCount > tokens.length) {
      break;
    }

    const params = tokens.slice(index, index + paramCount).map((item) => Number(item));

    if (params.some((item) => Number.isNaN(item))) {
      break;
    }

    index += paramCount;

    switch (upper) {
      case "M": {
        const x = relative ? currentX + params[0] : params[0];
        const y = relative ? currentY + params[1] : params[1];

        current = startSubpath(x ?? 0, y ?? 0);
        command = relative ? "l" : "L";
        previousCommand = "M";
        break;
      }
      case "L": {
        const x = relative ? currentX + params[0] : params[0];
        const y = relative ? currentY + params[1] : params[1];

        pushLine(x ?? 0, y ?? 0);
        previousCommand = command;
        break;
      }
      case "H": {
        const x = relative ? currentX + params[0] : params[0];

        pushLine(x ?? 0, currentY);
        previousCommand = command;
        break;
      }
      case "V": {
        const y = relative ? currentY + params[0] : params[0];

        pushLine(currentX, y ?? 0);
        previousCommand = command;
        break;
      }
      case "C": {
        const x1 = relative ? currentX + params[0] : params[0];
        const y1 = relative ? currentY + params[1] : params[1];
        const x2 = relative ? currentX + params[2] : params[2];
        const y2 = relative ? currentY + params[3] : params[3];
        const x = relative ? currentX + params[4] : params[4];
        const y = relative ? currentY + params[5] : params[5];

        pushCubic(x1 ?? 0, y1 ?? 0, x2 ?? 0, y2 ?? 0, x ?? 0, y ?? 0);
        previousCommand = command;
        break;
      }
      case "S": {
        const reflected =
          previousCommand === "C" ||
          previousCommand === "c" ||
          previousCommand === "S" ||
          previousCommand === "s"
            ? {
                x: 2 * currentX - previousCubicX2,
                y: 2 * currentY - previousCubicY2,
              }
            : { x: currentX, y: currentY };
        const x2 = relative ? currentX + params[0] : params[0];
        const y2 = relative ? currentY + params[1] : params[1];
        const x = relative ? currentX + params[2] : params[2];
        const y = relative ? currentY + params[3] : params[3];

        pushCubic(reflected.x, reflected.y, x2 ?? 0, y2 ?? 0, x ?? 0, y ?? 0);
        previousCommand = command;
        break;
      }
      case "Q": {
        const qx = relative ? currentX + params[0] : params[0];
        const qy = relative ? currentY + params[1] : params[1];
        const x = relative ? currentX + params[2] : params[2];
        const y = relative ? currentY + params[3] : params[3];

        pushCubic(
          currentX + (2 / 3) * ((qx ?? 0) - currentX),
          currentY + (2 / 3) * ((qy ?? 0) - currentY),
          (x ?? 0) + (2 / 3) * ((qx ?? 0) - (x ?? 0)),
          (y ?? 0) + (2 / 3) * ((qy ?? 0) - (y ?? 0)),
          x ?? 0,
          y ?? 0,
        );
        previousQuadX = qx ?? 0;
        previousQuadY = qy ?? 0;
        previousCommand = command;
        break;
      }
      case "T": {
        const reflected =
          previousCommand === "Q" ||
          previousCommand === "q" ||
          previousCommand === "T" ||
          previousCommand === "t"
            ? {
                x: 2 * currentX - previousQuadX,
                y: 2 * currentY - previousQuadY,
              }
            : { x: currentX, y: currentY };
        const x = relative ? currentX + params[0] : params[0];
        const y = relative ? currentY + params[1] : params[1];

        pushCubic(
          currentX + (2 / 3) * (reflected.x - currentX),
          currentY + (2 / 3) * (reflected.y - currentY),
          (x ?? 0) + (2 / 3) * (reflected.x - (x ?? 0)),
          (y ?? 0) + (2 / 3) * (reflected.y - (y ?? 0)),
          x ?? 0,
          y ?? 0,
        );
        previousQuadX = reflected.x;
        previousQuadY = reflected.y;
        previousCommand = command;
        break;
      }
      case "A": {
        const x = relative ? currentX + params[5] : params[5];
        const y = relative ? currentY + params[6] : params[6];

        for (const cubic of arcToCubics(
          currentX,
          currentY,
          params[0] ?? 0,
          params[1] ?? 0,
          params[2] ?? 0,
          params[3] ?? 0,
          params[4] ?? 0,
          x ?? 0,
          y ?? 0,
        )) {
          pushCubic(
            cubic[0] ?? 0,
            cubic[1] ?? 0,
            cubic[2] ?? 0,
            cubic[3] ?? 0,
            cubic[4] ?? 0,
            cubic[5] ?? 0,
          );
        }

        previousCommand = command;
        break;
      }
      default: {
        break;
      }
    }
  }

  return subpaths;
}

export function drawSectionIcon(
  pdf: jsPDF,
  key: SectionIconKey,
  centerX: number,
  centerY: number,
  size: number,
): void {
  const def = SECTION_ICONS[key];
  const scale = size / def.viewBox;
  const originX = centerX - size / 2;
  const originY = centerY - size / 2;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(255, 255, 255);

  if (def.paint === "stroke") {
    pdf.setLineWidth(def.strokeWidth * scale);
    pdf.setLineCap("round");
    pdf.setLineJoin("round");
  }

  for (const pathData of def.paths) {
    for (const subpath of parseSvgPathData(pathData)) {
      const legs = subpath.legs.map((leg) => leg.map((v) => v * scale));

      pdf.lines(
        legs,
        originX + subpath.startX * scale,
        originY + subpath.startY * scale,
        [1, 1],
        def.paint === "fill" ? "F" : "S",
        subpath.closed,
      );
    }
  }
}
