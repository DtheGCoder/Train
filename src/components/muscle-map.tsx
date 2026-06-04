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

// Trainingsqualität je Muskel: rot = unzureichend, gelb = noch nicht ideal,
// grün = gut trainiert. Nur trainierte (Primär-)Muskeln bekommen einen Status.
export type MuscleStatus = "low" | "mid" | "high";
const STATUS_COLOR: Record<MuscleStatus, string> = {
  low: "var(--danger)",
  mid: "#f59e0b",
  high: "var(--success)",
};
const STATUS_RANK: Record<MuscleStatus, number> = { low: 0, mid: 1, high: 2 };

// Aus Sätzen je Muskel-Slug die Qualität ableiten (pro Einheit).
// Fair pro Einheit: ein voller Übungs-Umfang (≈3 harte Sätze) gilt als gut
// trainiert (grün). 2 Sätze = solide (gelb), 1 = nur angetippt (rot).
// (Sekundär beteiligte Muskeln zählen mit halbem Gewicht – daher Bruchwerte.)
export function muscleQuality(
  setsByMuscle: Record<string, number>,
): Record<string, MuscleStatus> {
  const out: Record<string, MuscleStatus> = {};
  for (const [slug, sets] of Object.entries(setsByMuscle)) {
    if (sets <= 0) continue;
    out[slug] = sets >= 3 ? "high" : sets >= 1.5 ? "mid" : "low";
  }
  return out;
}

export function MuscleMap({
  primary,
  secondary = [],
  status,
  className,
}: {
  primary?: string;
  secondary?: string[];
  // Status-Modus (rot/gelb/grün) – Schlüssel sind unsere Muskel-Slugs.
  status?: Record<string, MuscleStatus>;
  className?: string;
}) {
  const primarySet = new Set(primary ? (SLUG_MAP[primary] ?? []) : []);
  const secondarySet = new Set(secondary.flatMap((s) => SLUG_MAP[s] ?? []));

  // Status auf Datensatz-Slugs übertragen (höchster Status gewinnt bei Überlapp).
  const datasetStatus: Record<string, MuscleStatus> = {};
  if (status) {
    for (const [ourSlug, lvl] of Object.entries(status)) {
      for (const ds of SLUG_MAP[ourSlug] ?? []) {
        if (!datasetStatus[ds] || STATUS_RANK[lvl] > STATUS_RANK[datasetStatus[ds]]) {
          datasetStatus[ds] = lvl;
        }
      }
    }
  }

  const fillFor = (slug: string): string => {
    if (status) return datasetStatus[slug] ? STATUS_COLOR[datasetStatus[slug]] : BASE;
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

// Muskelkarte im Qualitäts-Modus + Legende. Färbt nur die trainierten Muskeln
// rot/gelb/grün; nicht trainierte bleiben neutral.
export function MuscleQualityMap({
  status,
  className,
}: {
  status: Record<string, MuscleStatus>;
  className?: string;
}) {
  const items: { color: string; label: string }[] = [
    { color: "var(--danger)", label: "Unzureichend" },
    { color: "#f59e0b", label: "Noch nicht ideal" },
    { color: "var(--success)", label: "Gut trainiert" },
  ];
  const has = Object.keys(status).length > 0;
  return (
    <div className={className}>
      <MuscleMap status={status} />
      {has && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
          {items.map((it) => (
            <span key={it.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: it.color }}
              />
              {it.label}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-muted">
        Nur die in dieser Einheit trainierten Muskelgruppen sind eingefärbt –
        nach Anzahl harter Sätze (≥5 grün · 3–4 gelb · 1–2 rot).
      </p>
    </div>
  );
}
