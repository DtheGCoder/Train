import { cn } from "@/lib/utils";

// Anatomische Muskelkarte im Linien-Stil (Vorder- & Rückansicht). Bewusst
// aufgeräumt: klare Körperkontur, dezente Muskel-Trennlinien, Arme deutlich vom
// Rumpf abgesetzt. Trainierte Muskeln werden gefüllt (Primär kräftig, Sekundär
// abgeschwächt) und ihre Kontur hervorgehoben. Hervorhebung kommt direkt aus den
// Übungsdaten → inhaltlich immer korrekt. Symmetrisch aus einer rechten Hälfte
// gespiegelt; Vorder-/Rückseite über Brust/Bauch bzw. Wirbelsäule/Gesäß klar
// unterscheidbar.

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

// Körper-Umriss (rechte Hälfte) – Arme klar abgesetzt, schmale Taille.
const SIL =
  "M110 22 C124 22 133 32 133 47 C133 58 129 65 124 69 C126 73 128 76 132 79 " +
  "C145 82 156 88 165 98 C175 107 179 118 178 134 C177 154 173 176 169 196 " +
  "C167 214 164 230 162 245 C161 256 161 264 159 272 C157 278 150 278 149 270 " +
  "C150 252 153 230 155 210 C156 188 156 162 152 142 C150 131 147 123 142 117 " +
  "C138 130 134 150 132 170 C131 178 130 184 130 190 C139 198 148 204 149 216 " +
  "C150 242 145 280 137 315 C134 335 130 355 127 377 C125 391 122 401 120 411 " +
  "C120 420 131 424 138 426 C128 431 117 431 116 425 C117 400 119 360 119 320 " +
  "C120 290 119 250 117 228 L110 224 L110 22 Z";

const FRONT: { id: string; d: string }[] = [
  { id: "chest", d: "M111 100 C127 101 144 106 152 120 C151 135 142 151 123 153 C117 153 113 142 112 131 Z" },
  { id: "deltF", d: "M152 95 C166 100 177 113 177 135 C177 146 172 152 165 150 C159 142 154 120 151 102 Z" },
  { id: "trapsF", d: "M111 77 C127 80 142 85 154 95 L153 98 C140 99 125 99 112 98 Z" },
  { id: "biceps", d: "M152 146 C164 149 169 165 168 188 C167 200 162 206 158 205 C154 194 152 168 152 148 Z" },
  { id: "foreF", d: "M152 214 C163 217 167 230 165 249 C164 261 159 268 155 269 C152 254 151 231 152 216 Z" },
  { id: "abs", d: "M110 138 L131 140 C132 166 131 194 129 206 L110 206 Z" },
  { id: "obliques", d: "M132 152 C140 160 142 172 139 190 C137 198 134 202 130 202 C131 186 131 168 132 152 Z" },
  { id: "quads", d: "M110 215 C128 212 145 217 147 235 C147 261 139 295 126 314 C120 302 113 270 111 240 Z" },
];

const BACK: { id: string; d: string }[] = [
  { id: "trapsB", d: "M110 76 C126 80 141 86 153 96 C146 112 132 128 116 140 L110 140 Z" },
  { id: "deltB", d: "M152 95 C166 100 177 113 177 135 C177 146 172 152 165 150 C159 142 154 120 151 102 Z" },
  { id: "upperback", d: "M118 130 C130 132 140 138 140 150 C134 156 124 156 117 152 Z" },
  { id: "lats", d: "M116 154 C130 158 142 172 140 196 C132 210 122 212 116 210 Z" },
  { id: "triceps", d: "M152 146 C164 149 169 165 168 188 C167 200 162 206 158 205 C154 194 152 168 152 148 Z" },
  { id: "foreB", d: "M152 214 C163 217 167 230 165 249 C164 261 159 268 155 269 C152 254 151 231 152 216 Z" },
  { id: "lowerback", d: "M111 212 L126 213 C127 230 126 244 124 252 L111 252 Z" },
  { id: "glutes", d: "M111 216 C128 214 145 224 146 246 C146 262 134 271 116 271 Z" },
  { id: "hamstrings", d: "M114 274 C128 272 141 284 139 307 C137 336 128 357 120 364 Z" },
  { id: "calves", d: "M114 369 C127 372 133 386 131 405 C129 416 121 420 116 418 Z" },
];

// Wenige, klare Definitionslinien (nie gefüllt) – bewusst sparsam.
const LINES_FRONT =
  "M112 132 C120 137 127 140 132 140 " + // untere Brustlinie
  "M99 160 H123 M99 176 H121 M110 141 V206 " + // Bauch (sparsam)
  "M126 222 C130 255 126 290 122 312"; // Oberschenkel-Trennung

const LINES_BACK =
  "M110 80 V210 " + // Wirbelsäule
  "M110 216 V264 " + // Gesäßspalte
  "M125 290 C128 320 123 348 119 363"; // Hamstring-Trennung

const OUTLINE = "var(--muted)"; // Körperkontur, gut sichtbar
const DETAIL = "#6f6f78"; // Muskel-/Definitionslinien, dezent
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

  const muscles = (shapes: { id: string; d: string }[]) =>
    shapes.flatMap((s) => {
      const isPrim = primaryRegions.has(s.id);
      const isSec = secondaryRegions.has(s.id);
      const on = isPrim || isSec;
      const props = {
        fill: on ? HILITE : "none",
        fillOpacity: isPrim ? 0.62 : isSec ? 0.3 : 0,
        stroke: on ? HILITE : DETAIL,
        strokeWidth: 0.7,
        opacity: on ? 1 : 0.55,
        strokeLinejoin: "round" as const,
      };
      return [
        <path key={`${s.id}-a`} d={s.d} {...props} />,
        <path key={`${s.id}-b`} d={s.d} transform={MIRROR} {...props} />,
      ];
    });

  const lineGroup = (d: string) => (
    <>
      <path d={d} fill="none" stroke={DETAIL} strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />
      <path d={d} transform={MIRROR} fill="none" stroke={DETAIL} strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />
    </>
  );

  const outline = (
    <>
      <path d={SIL} fill="none" stroke={OUTLINE} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={SIL} transform={MIRROR} fill="none" stroke={OUTLINE} strokeWidth={1.1} strokeLinejoin="round" />
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
        <g stroke={DETAIL} strokeWidth={0.7} opacity={0.6} strokeLinecap="round">
          <line x1="103" y1="45" x2="108" y2="45" />
          <line x1="112" y1="45" x2="117" y2="45" />
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
