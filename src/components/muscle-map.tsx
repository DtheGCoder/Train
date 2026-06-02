import { cn } from "@/lib/utils";
import { bodyFront, bodyBack, type BodyPart } from "@/lib/body-muscle-data";

// Anatomische Muskelkarte (Vorder- & Rückansicht) auf Basis eines frei
// lizenzierten Anatomie-Datensatzes (react-native-body-highlighter, MIT –
// siehe src/lib/body-muscle-data.ts). Die trainierten Muskeln werden
// hervorgehoben (Primär kräftig, Sekundär abgeschwächt); die Auswahl kommt
// direkt aus den Übungsdaten → inhaltlich immer korrekt.

// Unsere Muskel-Slugs → Slugs des Anatomie-Datensatzes.
const SLUG_MAP: Record<string, string[]> = {
  chest: ["chest"],
  shoulders: ["deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs"],
  obliques: ["obliques"],
  lats: ["upper-back"],
  back: ["upper-back"],
  traps: ["trapezius"],
  lowerback: ["lower-back"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  fullbody: [
    "chest", "deltoids", "biceps", "triceps", "forearm", "abs", "obliques",
    "upper-back", "trapezius", "lower-back", "quadriceps", "hamstring",
    "gluteal", "calves",
  ],
  cardio: ["quadriceps", "hamstring", "calves", "abs"],
};

const BASE = "#33333c"; // Körper/Muskel-Grundfarbe
const STROKE = "var(--background)"; // dunkle Trennlinien zwischen den Muskeln
const HILITE = "var(--primary)";
const HILITE2 = `color-mix(in srgb, var(--primary) 50%, ${BASE})`;

export function MuscleMap({
  primary,
  secondary = [],
  className,
}: {
  primary: string;
  secondary?: string[];
  className?: string;
}) {
  const primarySet = new Set(SLUG_MAP[primary] ?? []);
  const secondarySet = new Set(secondary.flatMap((s) => SLUG_MAP[s] ?? []));

  const fillFor = (slug: string): string => {
    if (primarySet.has(slug)) return HILITE;
    if (secondarySet.has(slug)) return HILITE2;
    return BASE;
  };

  const render = (parts: BodyPart[]) =>
    parts.flatMap((part) => {
      const fill = fillFor(part.slug);
      const ds = [
        ...(part.path.common ?? []),
        ...(part.path.left ?? []),
        ...(part.path.right ?? []),
      ];
      return ds.map((d, i) => (
        <path
          key={`${part.slug}-${i}`}
          d={d}
          fill={fill}
          stroke={STROKE}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      ));
    });

  return (
    <svg
      viewBox="0 0 1448 1470"
      className={cn("w-full", className)}
      role="img"
      aria-label="Trainierte Muskelgruppen – Vorder- und Rückansicht"
    >
      {/* Vorderseite (x 0–724), Rückseite (x 724–1448) – bereits nebeneinander */}
      {render(bodyFront)}
      {render(bodyBack)}
      <text x="362" y="1456" textAnchor="middle" fontSize="40" fontWeight="600" fill="var(--muted)">
        Vorderseite
      </text>
      <text x="1086" y="1456" textAnchor="middle" fontSize="40" fontWeight="600" fill="var(--muted)">
        Rückseite
      </text>
    </svg>
  );
}
