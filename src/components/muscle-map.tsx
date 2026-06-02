import { cn } from "@/lib/utils";

// Anatomische Muskelkarte im Linien-Stil (Vorder- & Rückansicht): feine
// Muskel-Konturen wie in einer Anatomie-Illustration; die trainierten Muskeln
// werden ausgefüllt (Primär kräftig, Sekundär abgeschwächt). Hervorhebung kommt
// direkt aus den Übungsdaten → inhaltlich immer korrekt. Symmetrisch aus einer
// rechten Hälfte gespiegelt. Vorne durch Brust/Bauch/Gesicht, hinten durch
// Trapez-V, Wirbelsäule & Gesäßspalte eindeutig zu unterscheiden.

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

// Körper-Umriss (rechte Hälfte) – wird gespiegelt.
const SIL =
  "M110 22 C124 22 133 32 133 47 C133 58 129 65 124 69 C126 73 128 76 132 79 " +
  "C144 82 154 88 162 97 C171 105 175 116 174 131 C173 151 170 172 167 191 " +
  "C165 209 162 226 160 241 C159 252 159 261 157 269 C155 275 148 275 147 267 " +
  "C148 250 150 229 152 209 C153 187 154 163 151 143 C149 133 147 125 143 119 " +
  "C141 131 138 149 136 167 C135 175 134 181 134 187 C142 195 150 201 151 213 " +
  "C152 239 147 278 139 314 C136 334 132 354 129 376 C127 390 124 400 122 410 " +
  "C122 419 133 423 140 425 C130 430 118 430 117 424 C118 399 120 360 120 320 " +
  "C121 290 120 250 118 228 L110 224 L110 22 Z";

// Füllbare Muskel-Konturen (rechte Hälfte).
const FRONT: { id: string; d: string }[] = [
  { id: "chest", d: "M111 99 C127 100 143 105 151 119 C150 134 141 150 123 152 C117 152 113 141 112 130 Z" },
  { id: "deltF", d: "M151 93 C164 98 173 111 173 132 C173 143 168 149 161 147 C156 139 152 118 150 100 Z" },
  { id: "trapsF", d: "M111 76 C126 79 140 84 151 93 L150 96 C138 97 124 97 112 96 Z" },
  { id: "biceps", d: "M151 150 C161 153 166 168 165 189 C164 201 160 207 156 206 C152 195 151 170 151 152 Z" },
  { id: "foreF", d: "M150 211 C160 214 164 227 162 245 C161 257 157 264 153 265 C150 251 149 229 150 213 Z" },
  { id: "abs", d: "M110 137 L132 139 C133 165 132 193 130 205 L110 205 Z" },
  { id: "obliques", d: "M133 151 C141 159 143 171 140 189 C138 197 135 201 131 201 C132 185 132 167 133 151 Z" },
  { id: "quads", d: "M111 213 C128 210 145 215 148 233 C148 259 140 293 127 313 C121 301 114 270 112 240 Z" },
];

const BACK: { id: string; d: string }[] = [
  { id: "trapsB", d: "M110 74 C128 78 146 86 160 98 C151 117 133 141 114 161 L110 161 Z" },
  { id: "deltB", d: "M151 93 C164 98 173 111 173 132 C173 143 168 149 161 147 C156 139 152 118 150 100 Z" },
  { id: "upperback", d: "M139 119 C151 123 159 135 157 151 C151 159 143 159 138 153 Z" },
  { id: "lats", d: "M138 151 C150 159 153 179 143 201 C134 214 120 214 117 211 L117 156 C125 154 132 153 138 151 Z" },
  { id: "triceps", d: "M151 150 C161 153 166 168 165 189 C164 201 160 207 156 206 C152 195 151 170 151 152 Z" },
  { id: "foreB", d: "M150 211 C160 214 164 227 162 245 C161 257 157 264 153 265 C150 251 149 229 150 213 Z" },
  { id: "lowerback", d: "M110 200 L127 201 C128 223 127 241 125 251 L110 251 Z" },
  { id: "glutes", d: "M112 210 C129 208 146 218 147 241 C147 258 135 268 117 268 C114 253 113 230 112 212 Z" },
  { id: "hamstrings", d: "M114 270 C129 268 142 281 140 305 C138 335 128 357 120 365 C116 351 114 308 114 272 Z" },
  { id: "calves", d: "M114 367 C128 370 134 385 132 405 C130 417 121 421 116 419 C115 405 114 387 114 369 Z" },
];

// Reine Definitionslinien (Muskel-Trennungen, nie gefüllt).
const LINES_FRONT =
  "M126 70 L118 88 M122 71 L120 88 " + // Sternocleidomastoideus (Hals)
  "M112 130 C120 135 127 138 132 138 " + // untere Brustlinie
  "M134 154 l5 4 M133 161 l6 3 M133 168 l6 3 " + // Serratus
  "M96 157 H124 M97 173 H123 M98 189 H122 M110 139 V205 " + // Bauch (Sixpack)
  "M129 218 C133 250 130 285 124 310 " + // Rectus femoris / Vastus-Teilung
  "M120 214 C112 240 113 280 121 305 " + // Sartorius
  "M150 168 C156 175 158 182 158 190"; // Brachialis

const LINES_BACK =
  "M110 78 V205 " + // Wirbelsäule
  "M114 161 L132 140 M114 161 C124 175 128 190 128 200 " + // unterer Trapez (V)
  "M114 246 C124 250 130 250 134 246 " + // Gesäßfalte
  "M110 214 V262 " + // Gesäßspalte
  "M125 285 C129 315 124 345 119 362 " + // Hamstring-Teilung
  "M114 382 C124 384 128 384 131 382 M120 405 C124 412 124 412 128 405"; // Gastrocnemius-Köpfe

const STROKE = "var(--muted)";
const HILITE = "var(--primary)";

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

  const styleFor = (id: string): { fill: string; fillOpacity: number; stroke: string } => {
    if (primaryRegions.has(id))
      return { fill: HILITE, fillOpacity: 0.6, stroke: HILITE };
    if (secondaryRegions.has(id))
      return { fill: HILITE, fillOpacity: 0.28, stroke: HILITE };
    return { fill: "none", fillOpacity: 0, stroke: STROKE };
  };

  const muscles = (shapes: { id: string; d: string }[]) =>
    shapes.flatMap((s) => {
      const st = styleFor(s.id);
      const common = {
        fill: st.fill,
        fillOpacity: st.fillOpacity,
        stroke: st.stroke,
        strokeWidth: 0.8,
        strokeLinejoin: "round" as const,
      };
      return [
        <path key={`${s.id}-a`} d={s.d} {...common} />,
        <path key={`${s.id}-b`} d={s.d} transform={MIRROR} {...common} />,
      ];
    });

  const lineGroup = (d: string) => (
    <>
      <path d={d} fill="none" stroke={STROKE} strokeWidth={0.7} opacity={0.85} strokeLinecap="round" />
      <path d={d} transform={MIRROR} fill="none" stroke={STROKE} strokeWidth={0.7} opacity={0.85} strokeLinecap="round" />
    </>
  );

  const outline = (
    <>
      <path d={SIL} fill="none" stroke={STROKE} strokeWidth={1} strokeLinejoin="round" />
      <path d={SIL} transform={MIRROR} fill="none" stroke={STROKE} strokeWidth={1} strokeLinejoin="round" />
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
        {outline}
        {muscles(FRONT)}
        {lineGroup(LINES_FRONT)}
        {/* neutrales Gesicht (Nase + Brauen) → Vorderseite */}
        <g stroke={STROKE} strokeWidth={0.7} opacity={0.7} strokeLinecap="round">
          <line x1="110" y1="45" x2="110" y2="53" />
          <line x1="103" y1="44" x2="108" y2="44" />
          <line x1="112" y1="44" x2="117" y2="44" />
        </g>
      </g>

      {/* RÜCKANSICHT */}
      <g transform="translate(220 0)">
        {outline}
        {muscles(BACK)}
        {lineGroup(LINES_BACK)}
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
