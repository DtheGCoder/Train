import { cn } from "@/lib/utils";

// Anatomische Muskelkarte (Vorder- & Rückansicht). Hebt GENAU die Muskeln
// hervor, die eine Übung trainiert – abgeleitet aus den eigenen Übungsdaten
// (Primär-/Sekundärmuskel). Dadurch ist die Darstellung immer korrekt:
// hervorgehoben = tatsächlich beanspruchter Muskel. Kein erfundenes
// Bewegungsbild, sondern eine verlässliche Ziel-Muskel-Karte.

// Muskel-Slug → hervorzuhebende Regionen-IDs (front/back).
const REGIONS: Record<string, string[]> = {
  chest: ["chestL", "chestR"],
  shoulders: ["deltFL", "deltFR", "deltBL", "deltBR"],
  biceps: ["bicepsL", "bicepsR"],
  triceps: ["tricepsL", "tricepsR"],
  forearms: ["foreFL", "foreFR", "foreBL", "foreBR"],
  abs: ["abs"],
  obliques: ["obliqueL", "obliqueR"],
  lats: ["latL", "latR"],
  back: ["backL", "backR"],
  traps: ["traps", "trapsF"],
  lowerback: ["lowerback"],
  quads: ["quadL", "quadR"],
  hamstrings: ["hamL", "hamR"],
  glutes: ["gluteL", "gluteR"],
  calves: ["calfL", "calfR"],
  fullbody: [
    "chestL", "chestR", "deltFL", "deltFR", "deltBL", "deltBR", "abs",
    "latL", "latR", "backL", "backR", "quadL", "quadR", "hamL", "hamR",
    "gluteL", "gluteR", "traps", "lowerback",
  ],
  cardio: ["quadL", "quadR", "hamL", "hamR", "calfL", "calfR", "abs"],
};

// Eine Region: Ellipse (e) oder abgerundetes Rechteck (r). „m" = Muskel
// (kann hervorgehoben werden), sonst neutrales Verbindungsstück (Kopf, Hände …).
type Shape =
  | { t: "e"; id?: string; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { t: "r"; id?: string; x: number; y: number; w: number; h: number; rx: number };

// --- Vorderansicht (x ~ 8..112) ---
const FRONT: Shape[] = [
  { t: "e", cx: 60, cy: 16, rx: 10, ry: 12 }, // Kopf
  { t: "e", cx: 60, cy: 30, rx: 6, ry: 6 }, // Hals
  { t: "e", id: "deltFL", cx: 41, cy: 45, rx: 10, ry: 9 },
  { t: "e", id: "deltFR", cx: 79, cy: 45, rx: 10, ry: 9 },
  { t: "e", id: "chestL", cx: 51, cy: 54, rx: 11, ry: 9 },
  { t: "e", id: "chestR", cx: 69, cy: 54, rx: 11, ry: 9 },
  { t: "e", id: "bicepsL", cx: 33, cy: 66, rx: 7, ry: 15, rot: -8 },
  { t: "e", id: "bicepsR", cx: 87, cy: 66, rx: 7, ry: 15, rot: 8 },
  { t: "e", id: "foreFL", cx: 28, cy: 92, rx: 6, ry: 16, rot: -8 },
  { t: "e", id: "foreFR", cx: 92, cy: 92, rx: 6, ry: 16, rot: 8 },
  { t: "e", cx: 24, cy: 113, rx: 5, ry: 6 }, // Hand L
  { t: "e", cx: 96, cy: 113, rx: 5, ry: 6 }, // Hand R
  { t: "e", id: "obliqueL", cx: 46, cy: 80, rx: 5, ry: 14 },
  { t: "e", id: "obliqueR", cx: 74, cy: 80, rx: 5, ry: 14 },
  { t: "r", id: "abs", x: 51, y: 64, w: 18, h: 34, rx: 6 },
  { t: "r", x: 48, y: 100, w: 24, h: 9, rx: 4 }, // Becken
  { t: "e", id: "quadL", cx: 52, cy: 142, rx: 11, ry: 33, rot: 3 },
  { t: "e", id: "quadR", cx: 68, cy: 142, rx: 11, ry: 33, rot: -3 },
  { t: "e", cx: 52, cy: 174, rx: 7, ry: 5 }, // Knie L
  { t: "e", cx: 68, cy: 174, rx: 7, ry: 5 }, // Knie R
  { t: "e", cx: 52, cy: 202, rx: 7, ry: 26 }, // Schienbein L (neutral)
  { t: "e", cx: 68, cy: 202, rx: 7, ry: 26 }, // Schienbein R (neutral)
  { t: "e", cx: 52, cy: 232, rx: 7, ry: 5 }, // Fuß L
  { t: "e", cx: 68, cy: 232, rx: 7, ry: 5 }, // Fuß R
  { t: "e", id: "trapsF", cx: 60, cy: 38, rx: 13, ry: 6 }, // obere Trapez (vorn)
];

// --- Rückansicht (x ~ 148..252, also +140 zur Frontachse) ---
const BACK: Shape[] = [
  { t: "e", cx: 200, cy: 16, rx: 10, ry: 12 }, // Kopf
  { t: "e", id: "traps", cx: 200, cy: 40, rx: 20, ry: 11 }, // Trapez
  { t: "e", id: "deltBL", cx: 181, cy: 45, rx: 10, ry: 9 },
  { t: "e", id: "deltBR", cx: 219, cy: 45, rx: 10, ry: 9 },
  { t: "e", id: "backL", cx: 192, cy: 58, rx: 9, ry: 8 },
  { t: "e", id: "backR", cx: 208, cy: 58, rx: 9, ry: 8 },
  { t: "e", id: "tricepsL", cx: 173, cy: 66, rx: 7, ry: 15, rot: 8 },
  { t: "e", id: "tricepsR", cx: 227, cy: 66, rx: 7, ry: 15, rot: -8 },
  { t: "e", id: "latL", cx: 190, cy: 76, rx: 9, ry: 15 },
  { t: "e", id: "latR", cx: 210, cy: 76, rx: 9, ry: 15 },
  { t: "e", id: "foreBL", cx: 168, cy: 92, rx: 6, ry: 16, rot: 8 },
  { t: "e", id: "foreBR", cx: 232, cy: 92, rx: 6, ry: 16, rot: -8 },
  { t: "e", cx: 164, cy: 113, rx: 5, ry: 6 }, // Hand L
  { t: "e", cx: 236, cy: 113, rx: 5, ry: 6 }, // Hand R
  { t: "r", id: "lowerback", x: 191, y: 90, w: 18, h: 14, rx: 5 },
  { t: "e", id: "gluteL", cx: 192, cy: 115, rx: 10, ry: 10 },
  { t: "e", id: "gluteR", cx: 208, cy: 115, rx: 10, ry: 10 },
  { t: "e", id: "hamL", cx: 192, cy: 148, rx: 10, ry: 28, rot: 2 },
  { t: "e", id: "hamR", cx: 208, cy: 148, rx: 10, ry: 28, rot: -2 },
  { t: "e", cx: 192, cy: 176, rx: 7, ry: 5 }, // Kniekehle L
  { t: "e", cx: 208, cy: 176, rx: 7, ry: 5 }, // Kniekehle R
  { t: "e", id: "calfL", cx: 192, cy: 202, rx: 8, ry: 25 },
  { t: "e", id: "calfR", cx: 208, cy: 202, rx: 8, ry: 25 },
  { t: "e", cx: 192, cy: 232, rx: 7, ry: 5 }, // Fuß L
  { t: "e", cx: 208, cy: 232, rx: 7, ry: 5 }, // Fuß R
];

export function MuscleMap({
  primary,
  secondary = [],
  className,
}: {
  primary: string;
  secondary?: string[];
  className?: string;
}) {
  const primaryRegions = new Set(REGIONS[primary] ?? []);
  const secondaryRegions = new Set(
    secondary.flatMap((s) => REGIONS[s] ?? []),
  );

  const fillFor = (id?: string): string => {
    if (id && primaryRegions.has(id)) return "var(--primary)";
    if (id && secondaryRegions.has(id)) return "color-mix(in srgb, var(--primary) 42%, transparent)";
    return "var(--surface-2)";
  };

  const render = (shapes: Shape[]) =>
    shapes.map((s, i) => {
      const fill = fillFor(s.id);
      const common = {
        fill,
        stroke: "var(--border)",
        strokeWidth: 1,
      };
      if (s.t === "e") {
        return (
          <ellipse
            key={i}
            cx={s.cx}
            cy={s.cy}
            rx={s.rx}
            ry={s.ry}
            transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined}
            {...common}
          />
        );
      }
      return (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />
      );
    });

  return (
    <svg
      viewBox="0 0 260 252"
      className={cn("w-full", className)}
      role="img"
      aria-label="Trainierte Muskelgruppen (Vorder- und Rückansicht)"
    >
      {/* Vorderansicht */}
      {render(FRONT)}
      {/* Rückansicht */}
      {render(BACK)}
      {/* Beschriftung der Ansichten */}
      <text x="60" y="250" textAnchor="middle" fontSize="9" fill="var(--muted)">
        Vorderseite
      </text>
      <text x="200" y="250" textAnchor="middle" fontSize="9" fill="var(--muted)">
        Rückseite
      </text>
    </svg>
  );
}
