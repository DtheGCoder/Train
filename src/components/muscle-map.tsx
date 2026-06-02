import { cn } from "@/lib/utils";

// Anatomische Muskelkarte (Vorder- & Rückansicht) als detaillierte SVG-Figur.
// Hebt GENAU die Muskeln hervor, die eine Übung trainiert – abgeleitet aus den
// Übungsdaten (Primär/Sekundär), daher inhaltlich immer korrekt. Die Figuren
// sind symmetrisch aus einer rechten Hälfte gespiegelt; zentrale Muskeln
// (Brust, Bauch, Trapez) teilen sich dadurch sauber an der Mittellinie wie beim
// echten Körper. Vorne durch Gesicht erkennbar, hinten durch Wirbelsäulen- und
// Gesäßlinie.

const CX = 110; // Mittellinie einer Figur
const MIRROR = `translate(${CX * 2} 0) scale(-1 1)`;

// Muskel-Slug → hervorzuhebende Regionen-IDs (front/back).
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

// Körper-Silhouette (rechte Hälfte): Kopf → Schulter → Außenarm → Hand →
// Innenarm → Achsel → Rumpfseite → Hüfte → Außenbein → Fuß → Innenbein → Schritt
// → Mittellinie zurück. Wird gespiegelt → ganze Figur.
const SIL =
  "M110 16 C122 16 132 27 132 41 C132 54 128 62 122 66 L119 74 " +
  "C131 77 143 83 153 93 C164 100 170 110 170 123 C170 140 168 152 166 164 " +
  "C164 180 162 194 160 208 C159 222 157 232 156 242 C159 248 160 254 158 260 " +
  "C155 264 149 264 147 259 C146 248 147 239 149 231 C151 215 153 197 151 179 " +
  "C150 166 146 151 139 136 C136 128 133 120 131 114 C129 132 123 147 118 160 " +
  "C123 177 137 187 139 202 C139 217 135 237 129 257 C123 280 118 300 115 317 " +
  "C115 323 114 328 115 333 C118 348 120 363 119 381 C118 395 115 402 114 408 " +
  "C116 416 126 420 130 426 C120 428 117 428 117 425 C116 401 117 361 117 333 " +
  "C117 301 116 271 115 253 L110 251 L110 16 Z";

// --- Muskeln Vorderansicht (rechte Hälfte) ---
const FRONT: { id: string; d: string }[] = [
  { id: "trapsF", d: "M113 74 C128 77 142 83 151 91 C140 93 126 93 114 92 Z" },
  { id: "deltF", d: "M150 91 C165 97 172 109 171 124 C171 131 168 135 162 135 C156 131 152 117 150 101 Z" },
  { id: "chest", d: "M112 95 C127 96 142 101 150 112 C150 122 142 132 123 132 C117 132 113 129 112 125 Z" },
  { id: "biceps", d: "M151 112 C162 114 167 126 166 144 C166 156 163 164 158 166 C152 160 150 136 150 117 Z" },
  { id: "foreF", d: "M150 170 C160 172 164 184 162 202 C161 216 158 226 154 232 C150 224 148 202 148 184 Z" },
  { id: "abs", d: "M112 133 L130 135 C131 161 130 189 128 201 L112 201 Z" },
  { id: "obliques", d: "M131 139 C138 147 140 159 138 179 C137 191 134 197 130 199 C131 179 131 157 131 139 Z" },
  { id: "quads", d: "M114 211 C128 207 138 217 138 231 C137 257 128 291 118 313 C115 301 113 271 113 241 Z" },
];

// --- Muskeln Rückansicht (rechte Hälfte) ---
const BACK: { id: string; d: string }[] = [
  { id: "trapsB", d: "M110 71 C128 75 144 83 152 93 C140 111 124 131 112 151 C112 125 111 97 110 73 Z" },
  { id: "deltB", d: "M150 91 C165 97 172 109 171 124 C171 131 168 135 162 135 C156 131 152 117 150 101 Z" },
  { id: "upperback", d: "M138 119 C148 121 153 131 151 145 C147 151 141 151 136 147 C137 135 137 127 138 119 Z" },
  { id: "lats", d: "M136 151 C146 157 150 173 140 197 C130 213 118 215 112 213 L112 159 C120 157 130 153 136 151 Z" },
  { id: "triceps", d: "M150 112 C162 114 167 127 166 145 C166 157 163 165 158 167 C152 161 150 137 150 117 Z" },
  { id: "foreB", d: "M150 170 C160 172 164 184 162 202 C161 216 158 226 154 232 C150 224 148 202 148 184 Z" },
  { id: "lowerback", d: "M112 201 L126 201 C127 221 126 237 124 245 L112 245 Z" },
  { id: "glutes", d: "M112 247 C130 245 143 253 143 269 C143 283 132 291 116 291 L112 291 Z" },
  { id: "hamstrings", d: "M112 293 C128 291 138 299 136 315 C134 341 124 357 116 361 L112 361 Z" },
  { id: "calves", d: "M112 367 C126 369 132 381 130 399 C128 411 120 417 114 417 L112 415 Z" },
];

const SIL_FILL = "#2a2a31";
const SIL_STROKE = "#41414c";
const MUSCLE_BASE = "#30303a"; // dezent – Definition kommt v. a. über die Konturlinien
const RELIEF = "#4a4a57";

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
      return `color-mix(in srgb, var(--primary) 55%, ${MUSCLE_BASE})`;
    return MUSCLE_BASE;
  };

  const muscles = (shapes: { id: string; d: string }[]) =>
    shapes.flatMap((s, i) => [
      <path
        key={`${s.id}-${i}-a`}
        d={s.d}
        fill={fillFor(s.id)}
        stroke={RELIEF}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />,
      <path
        key={`${s.id}-${i}-b`}
        d={s.d}
        transform={MIRROR}
        fill={fillFor(s.id)}
        stroke={RELIEF}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />,
    ]);

  const silhouette = (
    <>
      <path d={SIL} fill={SIL_FILL} stroke={SIL_STROKE} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={SIL} transform={MIRROR} fill={SIL_FILL} stroke={SIL_STROKE} strokeWidth={1.2} strokeLinejoin="round" />
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
        {/* Bauch-Segmentierung (Sixpack) + Mittellinie */}
        <g stroke={RELIEF} strokeWidth={0.7} opacity={0.65}>
          <line x1="96" y1="152" x2="124" y2="152" />
          <line x1="97" y1="170" x2="123" y2="170" />
          <line x1="98" y1="188" x2="122" y2="188" />
          <line x1="110" y1="135" x2="110" y2="200" />
        </g>
        {/* Schlüsselbeine → eindeutig Vorderseite (anatomisch, nicht verspielt) */}
        <g stroke={RELIEF} strokeWidth={1.1} strokeLinecap="round" opacity={0.75}>
          <line x1="110" y1="80" x2="95" y2="90" />
          <line x1="110" y1="80" x2="125" y2="90" />
        </g>
      </g>

      {/* RÜCKANSICHT */}
      <g transform="translate(220 0)">
        {silhouette}
        {muscles(BACK)}
        {/* Wirbelsäule + Gesäßspalte → eindeutig Rückseite */}
        <g stroke={RELIEF} strokeWidth={1} strokeLinecap="round" opacity={0.8}>
          <line x1="110" y1="74" x2="110" y2="200" />
          <line x1="110" y1="248" x2="110" y2="288" />
        </g>
      </g>

      {/* Beschriftung */}
      <text x="110" y="448" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)">
        Vorderseite
      </text>
      <text x="330" y="448" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)">
        Rückseite
      </text>
    </svg>
  );
}
