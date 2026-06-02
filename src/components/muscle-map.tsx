import { cn } from "@/lib/utils";

// Anatomische Muskelkarte (Vorder- & Rückansicht). Eine glatte, durchgehende
// Körper-Silhouette; die Muskeln sind unsichtbar Teil des Körpers und LEUCHTEN
// nur auf, wenn die Übung sie trainiert (Primär kräftig, Sekundär abgeschwächt).
// Dadurch wirkt der Körper sauber wie eine echte Figur statt aus Einzelteilen.
// Hervorhebung kommt direkt aus den Übungsdaten → inhaltlich immer korrekt.
// Vorne durch Schlüsselbeine + Bauch-Segmentierung erkennbar, hinten durch
// Wirbelsäulen- und Gesäßlinie. Symmetrisch aus einer rechten Hälfte gespiegelt.

const CX = 110;
const MIRROR = `translate(${CX * 2} 0) scale(-1 1)`;

const REGIONS: Record<string, string[]> = {
  chest: ["chest"],
  shoulders: ["deltF", "deltB"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["foreF", "foreB"],
  abs: ["abs"],
  obliques: ["obliques"],
  lats: ["lats"],
  back: ["upperback"],
  traps: ["trapsF", "trapsB"],
  lowerback: ["lowerback"],
  quads: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves"],
  fullbody: [
    "chest", "deltF", "deltB", "biceps", "triceps", "abs", "obliques",
    "lats", "upperback", "trapsF", "trapsB", "lowerback", "quads",
    "hamstrings", "glutes", "calves",
  ],
  cardio: ["quads", "hamstrings", "calves", "abs"],
};

// Glatte Körper-Silhouette (rechte Hälfte) – wird gespiegelt.
const SIL =
  "M110 22 C124 22 133 32 133 47 C133 58 129 65 124 69 C126 73 128 76 132 79 " +
  "C143 82 153 87 161 96 C170 104 174 115 173 130 C172 150 169 171 166 190 " +
  "C164 208 161 225 159 240 C158 251 158 260 156 268 C154 274 147 274 146 266 " +
  "C147 249 149 228 151 208 C152 186 153 162 150 142 C148 132 146 124 142 118 " +
  "C140 130 137 148 135 166 C134 174 133 180 133 186 C141 194 149 200 150 212 " +
  "C151 238 146 277 138 313 C135 333 131 353 128 375 C126 389 123 399 121 409 " +
  "C121 418 132 422 139 424 C129 429 118 429 117 423 C118 398 120 360 120 320 " +
  "C121 290 120 250 118 228 L110 224 L110 22 Z";

const FRONT: { id: string; d: string }[] = [
  { id: "chest", d: "M111 98 C126 99 142 104 150 118 C150 134 141 150 124 152 C117 152 113 140 111 128 Z" },
  { id: "deltF", d: "M150 92 C162 98 170 110 171 131 C171 141 167 147 161 145 C155 137 151 116 149 100 Z" },
  { id: "trapsF", d: "M112 74 C128 77 142 82 152 92 C140 94 124 94 113 92 Z" },
  { id: "biceps", d: "M150 150 C160 152 166 166 165 188 C164 202 160 208 155 208 C151 196 150 170 150 152 Z" },
  { id: "foreF", d: "M150 214 C159 216 162 228 160 244 C159 256 156 262 152 264 C149 252 148 230 149 216 Z" },
  { id: "abs", d: "M110 136 L131 138 C132 164 131 192 129 204 L110 204 Z" },
  { id: "obliques", d: "M132 142 C139 150 141 162 139 182 C138 192 135 197 131 198 C132 178 132 158 132 142 Z" },
  { id: "quads", d: "M111 214 C128 210 145 214 147 232 C147 262 137 296 124 314 C118 300 113 268 112 240 Z" },
];

const BACK: { id: string; d: string }[] = [
  { id: "trapsB", d: "M110 74 C130 78 148 86 160 98 C148 120 130 145 113 165 C113 134 111 100 110 76 Z" },
  { id: "deltB", d: "M150 92 C162 98 170 110 171 131 C171 141 167 147 161 145 C155 137 151 116 149 100 Z" },
  { id: "upperback", d: "M138 120 C150 124 158 136 156 152 C150 160 142 160 136 154 C137 140 137 128 138 120 Z" },
  { id: "lats", d: "M136 152 C148 160 152 178 142 200 C132 214 118 214 116 212 L116 156 C124 154 130 153 136 152 Z" },
  { id: "triceps", d: "M150 150 C160 152 166 166 165 188 C164 202 160 208 155 208 C151 196 150 170 150 152 Z" },
  { id: "foreB", d: "M150 214 C159 216 162 228 160 244 C159 256 156 262 152 264 C149 252 148 230 149 216 Z" },
  { id: "lowerback", d: "M110 206 L127 207 C128 226 127 242 125 250 L110 250 Z" },
  { id: "glutes", d: "M112 212 C128 210 144 220 145 240 C145 256 134 266 117 266 C114 252 113 230 112 214 Z" },
  { id: "hamstrings", d: "M114 270 C128 268 140 280 138 302 C136 332 126 354 118 362 C115 350 114 310 114 272 Z" },
  { id: "calves", d: "M114 368 C126 370 132 384 130 402 C128 414 120 418 116 416 C115 404 114 386 114 370 Z" },
];

const BODY = "#2c2c34"; // Körperfarbe (= nicht trainierte Muskeln, unsichtbar)
const LINE = "#43434e"; // dezente anatomische Konturlinien

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
  const secondaryRegions = new Set(secondary.flatMap((s) => REGIONS[s] ?? []));

  const fillFor = (id: string): string => {
    if (primaryRegions.has(id)) return "var(--primary)";
    if (secondaryRegions.has(id))
      return `color-mix(in srgb, var(--primary) 55%, ${BODY})`;
    return BODY; // wie der Körper → unsichtbar, glatte Silhouette
  };

  const muscles = (shapes: { id: string; d: string }[]) =>
    shapes.flatMap((s) => [
      <path key={`${s.id}-a`} d={s.d} fill={fillFor(s.id)} />,
      <path key={`${s.id}-b`} d={s.d} transform={MIRROR} fill={fillFor(s.id)} />,
    ]);

  const silhouette = (
    <>
      <path d={SIL} fill={BODY} />
      <path d={SIL} transform={MIRROR} fill={BODY} />
    </>
  );

  return (
    <svg
      viewBox="0 0 440 452"
      className={cn("w-full", className)}
      role="img"
      aria-label="Trainierte Muskelgruppen – Vorder- und Rückansicht"
    >
      {/* VORDERANSICHT */}
      <g>
        {silhouette}
        {muscles(FRONT)}
        {/* Schlüsselbeine + Bauch-Segmentierung → eindeutig Vorderseite */}
        <g stroke={LINE} strokeWidth={0.8} opacity={0.6} fill="none" strokeLinecap="round">
          <line x1="110" y1="84" x2="96" y2="93" />
          <line x1="110" y1="84" x2="124" y2="93" />
          <line x1="96" y1="156" x2="124" y2="156" />
          <line x1="97" y1="172" x2="123" y2="172" />
          <line x1="98" y1="188" x2="122" y2="188" />
          <line x1="110" y1="138" x2="110" y2="204" />
        </g>
      </g>

      {/* RÜCKANSICHT */}
      <g transform="translate(220 0)">
        {silhouette}
        {muscles(BACK)}
        {/* Wirbelsäule + Gesäßspalte → eindeutig Rückseite */}
        <g stroke={LINE} strokeWidth={1} opacity={0.65} strokeLinecap="round">
          <line x1="110" y1="78" x2="110" y2="205" />
          <line x1="110" y1="214" x2="110" y2="262" />
        </g>
      </g>

      <text x="110" y="446" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--muted)">
        Vorderseite
      </text>
      <text x="330" y="446" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--muted)">
        Rückseite
      </text>
    </svg>
  );
}
