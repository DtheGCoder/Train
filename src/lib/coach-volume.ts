// Übergreifende Volumen-Intelligenz des Coaches: bewertet das Wochenvolumen je
// Muskelgruppe über ALLE Workouts und erkennt Balance, Frequenz und Über-/
// Unterlastung. Grundlage: evidenzbasierte Richtwerte (MEV/MAV/MRV – minimal
// effektives, adaptives Maximum-, maximal erholbares Volumen, harte Sätze/Woche).
// Reine Logik, kein LLM.

import type { CoachProfile, Experience } from "./coach";

export type VolGroupKey =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

type GroupDef = {
  key: VolGroupKey;
  label: string;
  slugs: string[]; // DB-Muskel-Slugs, die zu dieser Gruppe zählen
  mev: number; // Minimum für Fortschritt
  mav: number; // oberes Ende des optimalen Bereichs
  mrv: number; // darüber v. a. Ermüdung statt Reiz
  side: "push" | "pull" | "legs" | "core";
};

// Richtwerte (Mittelstufe). Werden je Erfahrung skaliert.
export const VOLUME_GROUPS: GroupDef[] = [
  { key: "chest", label: "Brust", slugs: ["chest"], mev: 8, mav: 18, mrv: 22, side: "push" },
  { key: "back", label: "Rücken", slugs: ["back", "lats", "traps", "lowerback"], mev: 10, mav: 20, mrv: 25, side: "pull" },
  { key: "shoulders", label: "Schultern", slugs: ["shoulders"], mev: 8, mav: 20, mrv: 26, side: "push" },
  { key: "biceps", label: "Bizeps", slugs: ["biceps", "forearms"], mev: 6, mav: 18, mrv: 22, side: "pull" },
  { key: "triceps", label: "Trizeps", slugs: ["triceps"], mev: 6, mav: 16, mrv: 20, side: "push" },
  { key: "quads", label: "Quadrizeps", slugs: ["quads"], mev: 8, mav: 18, mrv: 22, side: "legs" },
  { key: "hamstrings", label: "Beinbeuger", slugs: ["hamstrings"], mev: 6, mav: 16, mrv: 20, side: "legs" },
  { key: "glutes", label: "Gesäß", slugs: ["glutes"], mev: 4, mav: 14, mrv: 18, side: "legs" },
  { key: "calves", label: "Waden", slugs: ["calves"], mev: 6, mav: 16, mrv: 20, side: "legs" },
  { key: "abs", label: "Bauch", slugs: ["abs", "obliques"], mev: 6, mav: 20, mrv: 25, side: "core" },
];

const SLUG_TO_GROUP: Record<string, VolGroupKey> = (() => {
  const m: Record<string, VolGroupKey> = {};
  for (const g of VOLUME_GROUPS) for (const s of g.slugs) m[s] = g.key;
  return m;
})();

export function groupForSlug(slug: string): VolGroupKey | null {
  return SLUG_TO_GROUP[slug] ?? null;
}

// Start des 7-Tage-Fensters (ms). Als Helfer ausgelagert, damit Server-Seiten
// keine „unreine" Zeitfunktion direkt im Render aufrufen.
export function weeklyWindowStart(): number {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

const EXPERIENCE_FACTOR: Record<Experience, number> = {
  beginner: 0.7,
  intermediate: 1,
  advanced: 1.15,
};

export type Landmarks = { mev: number; mav: number; mrv: number };

export function landmarksFor(key: VolGroupKey, profile: CoachProfile): Landmarks {
  const g = VOLUME_GROUPS.find((x) => x.key === key)!;
  const f = EXPERIENCE_FACTOR[profile.experience] ?? 1;
  // Reines Kraftziel braucht etwas weniger Volumen, Ausdauer etwas mehr.
  const goalF = profile.goal === "strength" ? 0.85 : profile.goal === "endurance" ? 1.1 : 1;
  const s = f * goalF;
  return {
    mev: Math.round(g.mev * s),
    mav: Math.round(g.mav * s),
    mrv: Math.round(g.mrv * s),
  };
}

export type VolStatus = "none" | "low" | "optimal" | "high" | "excess";

export function volumeStatus(sets: number, key: VolGroupKey, profile: CoachProfile): VolStatus {
  if (sets <= 0) return "none";
  const { mev, mav, mrv } = landmarksFor(key, profile);
  if (sets < mev) return "low";
  if (sets <= mav) return "optimal";
  if (sets <= mrv) return "high";
  return "excess";
}

export const STATUS_LABEL: Record<VolStatus, string> = {
  none: "nicht trainiert",
  low: "zu wenig",
  optimal: "optimal",
  high: "oberes Ende",
  excess: "zu viel",
};

export const STATUS_COLOR: Record<VolStatus, string> = {
  none: "#3a3a44",
  low: "var(--danger)",
  optimal: "var(--success)",
  high: "#f59e0b",
  excess: "var(--danger)",
};

// Ein harter Satz, vorbereitet für die Gruppen-Zuordnung.
export type SetEntry = {
  primary: string; // primärer Muskel-Slug
  secondary: string[]; // sekundäre Muskel-Slugs
  day: string; // YYYY-MM-DD (für Frequenz)
};

export type WeeklyGroup = {
  key: VolGroupKey;
  label: string;
  sets: number; // gewichtete harte Sätze (primär 1, sekundär 0.5)
  days: number; // an wie vielen Tagen trainiert (Frequenz)
  status: VolStatus;
  mev: number;
  mav: number;
  mrv: number;
};

// Aggregiert harte Sätze je Muskelgruppe (primär 1, sekundär 0.5) und die
// Frequenz (Tage) – für ein 7-Tage-Fenster.
export function aggregateWeekly(
  entries: SetEntry[],
  profile: CoachProfile,
): WeeklyGroup[] {
  const sets: Record<string, number> = {};
  const daySet: Record<string, Set<string>> = {};
  const add = (key: VolGroupKey | null, amount: number, day: string, isPrimary: boolean) => {
    if (!key) return;
    sets[key] = (sets[key] ?? 0) + amount;
    // Frequenz nur über den Primärmuskel zählen (echte „Einheit für die Gruppe").
    if (isPrimary) (daySet[key] ??= new Set()).add(day);
  };
  for (const e of entries) {
    add(groupForSlug(e.primary), 1, e.day, true);
    for (const s of e.secondary) add(groupForSlug(s), 0.5, e.day, false);
  }
  return VOLUME_GROUPS.map((g) => {
    const s = Math.round((sets[g.key] ?? 0) * 2) / 2;
    const lm = landmarksFor(g.key, profile);
    return {
      key: g.key,
      label: g.label,
      sets: s,
      days: daySet[g.key]?.size ?? 0,
      status: volumeStatus(s, g.key, profile),
      ...lm,
    };
  });
}

export type VolumeInsights = {
  warnings: string[]; // Über-/Fehlbelastung, Balance
  actions: string[]; // konkrete Empfehlungen „diese Woche"
  balance: { pushSets: number; pullSets: number; note: string | null };
};

const MAJOR: VolGroupKey[] = ["chest", "back", "shoulders", "quads", "hamstrings"];

export function volumeInsights(groups: WeeklyGroup[]): VolumeInsights {
  const by = new Map(groups.map((g) => [g.key, g]));
  const warnings: string[] = [];
  const actions: string[] = [];

  for (const g of groups) {
    if (g.status === "excess") {
      warnings.push(
        `${g.label}: ${g.sets} Sätze diese Woche – über dem sinnvollen Maximum (~${g.mrv}). Mehr bringt v. a. Ermüdung; lieber etwas kürzen.`,
      );
    }
  }

  // Vernachlässigte große Gruppen.
  for (const key of MAJOR) {
    const g = by.get(key);
    if (!g) continue;
    if (g.status === "none") {
      actions.push(`${g.label} diese Woche noch gar nicht trainiert – plane mind. ${g.mev} Sätze ein.`);
    } else if (g.status === "low") {
      actions.push(`${g.label} erst ${g.sets} Sätze – für Wachstum Richtung ${g.mev}–${g.mav} aufbauen.`);
    }
  }

  // Frequenz: genug Volumen, aber nur 1× → besser verteilen.
  for (const g of groups) {
    if (g.sets >= g.mev && g.days === 1 && g.sets >= 8) {
      actions.push(`${g.label} alles an einem Tag – auf 2 Einheiten/Woche verteilen bringt mehr Reiz bei gleicher Müdigkeit.`);
    }
  }

  // Push/Pull-Balance.
  const sum = (side: "push" | "pull") =>
    VOLUME_GROUPS.filter((g) => g.side === side).reduce(
      (a, g) => a + (by.get(g.key)?.sets ?? 0),
      0,
    );
  const pushSets = Math.round(sum("push") * 2) / 2;
  const pullSets = Math.round(sum("pull") * 2) / 2;
  let note: string | null = null;
  if (pushSets + pullSets >= 12) {
    const ratio = pullSets > 0 ? pushSets / pullSets : 99;
    if (ratio >= 1.5) {
      note = `Deutlich mehr Druck (${pushSets}) als Zug (${pullSets}). Mehr Rücken/Bizeps beugt Dysbalancen & Schulterproblemen vor.`;
      warnings.push(note);
    } else if (ratio <= 0.66) {
      note = `Mehr Zug (${pullSets}) als Druck (${pushSets}) – meist unkritisch, aber Brust/Schultern nicht vergessen.`;
    } else {
      note = `Druck (${pushSets}) und Zug (${pullSets}) gut im Gleichgewicht.`;
    }
  }

  // Beine vs. Oberkörper grob.
  const legs = VOLUME_GROUPS.filter((g) => g.side === "legs").reduce(
    (a, g) => a + (by.get(g.key)?.sets ?? 0),
    0,
  );
  if (pushSets + pullSets >= 16 && legs < (by.get("quads")?.mev ?? 8)) {
    actions.push("Beine kommen diese Woche zu kurz – ein Beintag fehlt.");
  }

  return {
    warnings: warnings.slice(0, 4),
    actions: actions.slice(0, 5),
    balance: { pushSets, pullSets, note },
  };
}
