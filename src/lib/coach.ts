// Adaptiver Trainings-Coach — deterministische Sportwissenschaft (pure TS).
// Bewusst KEIN externes LLM: Empfehlungen müssen offline, sofort und
// reproduzierbar sein, damit der Coach im Satz zuverlässig reagiert.
// Grundlage: geschätztes 1RM (Epley), Ziel-spezifische Wiederholungs-/
// Intensitätsbereiche, Reps-in-Reserve und live nachgeführte Grenzen.

export type Goal = "strength" | "hypertrophy" | "endurance";
export type Experience = "beginner" | "intermediate" | "advanced";
export type CoachStyle = "cautious" | "balanced" | "aggressive";

export type RepStyle = "auto" | "low" | "high";

export type CoachProfile = {
  goal: Goal;
  experience: Experience;
  coachStyle: CoachStyle;
  bodyweightKg: number | null;
  heightCm: number | null;
  birthYear: number | null;
  sex: string;
  // Erweiterte Daten
  trainingDaysPerWeek: number | null;
  limitations: string;
  availableEquipment: string; // CSV Equipment-Slugs; "" = alles
  preferredRepStyle: RepStyle;
};

export const DEFAULT_PROFILE: CoachProfile = {
  goal: "hypertrophy",
  experience: "intermediate",
  coachStyle: "balanced",
  bodyweightKg: null,
  heightCm: null,
  birthYear: null,
  sex: "",
  trainingDaysPerWeek: null,
  limitations: "",
  availableEquipment: "",
  preferredRepStyle: "auto",
};

export const REP_STYLE_LABELS: Record<RepStyle, string> = {
  auto: "Automatisch (Coach entscheidet)",
  low: "Lieber schwerer / weniger Wdh.",
  high: "Lieber leichter / mehr Wdh.",
};

export type SetLike = { weight: number; reps: number; rpe?: number | null };

/* ---------------- Konfiguration ---------------- */

export const GOAL_CONFIG: Record<
  Goal,
  { repLow: number; repHigh: number; label: string }
> = {
  strength: { repLow: 3, repHigh: 6, label: "Kraft" },
  hypertrophy: { repLow: 8, repHigh: 12, label: "Muskelaufbau" },
  endurance: { repLow: 14, repHigh: 20, label: "Kraftausdauer" },
};

// repBias verschiebt das Ziel innerhalb des Bereichs, stepPct = Laststeigerung
// bei Übererfüllung, pushRpe = ab wann der Coach "drücken" darf, rir = geplante
// Reserve-Wiederholungen.
const STYLE_CONFIG: Record<
  CoachStyle,
  { repBias: number; stepPct: number; pushRpe: number; rir: number; label: string }
> = {
  cautious: { repBias: 0, stepPct: 0.02, pushRpe: 7.5, rir: 3, label: "Vorsichtig" },
  balanced: { repBias: 0.5, stepPct: 0.035, pushRpe: 8.5, rir: 2, label: "Ausgewogen" },
  aggressive: { repBias: 1, stepPct: 0.05, pushRpe: 9.5, rir: 1, label: "Aggressiv" },
};

// Anfänger steigern schneller (lineare Progression), Fortgeschrittene langsamer.
const EXPERIENCE_FACTOR: Record<Experience, number> = {
  beginner: 1.5,
  intermediate: 1.0,
  advanced: 0.6,
};

export const GOAL_LABELS: Record<Goal, string> = {
  strength: "Kraft",
  hypertrophy: "Muskelaufbau",
  endurance: "Kraftausdauer",
};
export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Erfahren",
};
export const STYLE_LABELS: Record<CoachStyle, string> = {
  cautious: "Vorsichtig",
  balanced: "Ausgewogen",
  aggressive: "Aggressiv",
};

/* ---------------- 1RM-Mathematik (Epley, beide Richtungen) ---------------- */

export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Last, um genau `reps` Wiederholungen zu schaffen (Maximalanstrengung).
export function weightForReps(oneRm: number, reps: number): number {
  if (oneRm <= 0 || reps <= 0) return 0;
  return oneRm / (1 + reps / 30);
}

// Geschätzte mögliche Wiederholungen bei gegebener Last.
export function repsForWeight(oneRm: number, weight: number): number {
  if (oneRm <= 0 || weight <= 0) return 0;
  const r = 30 * (oneRm / weight - 1);
  return Math.max(0, Math.round(r));
}

export function roundToIncrement(w: number, inc = 2.5): number {
  if (w <= 0) return 0;
  return Math.round(w / inc) * inc;
}

/* ---------------- e1RM aus Historie ---------------- */

// Bestes geschätztes 1RM über eine Menge an Sätzen.
export function bestE1RM(sets: SetLike[]): number {
  let best = 0;
  for (const s of sets) {
    const v = e1rm(s.weight, s.reps);
    if (v > best) best = v;
  }
  return best;
}

/* ---------------- Satz-Empfehlung ---------------- */

export type SetRecommendation = {
  weight: number;
  reps: number;
  rir: number;
  intensityPct: number; // % vom 1RM
  hasBaseline: boolean;
};

// Zielwiederholungen abhängig von Ziel + Stil + bevorzugtem Wdh.-Stil.
export function targetReps(profile: CoachProfile): number {
  const g = GOAL_CONFIG[profile.goal];
  const mid = (g.repLow + g.repHigh) / 2;
  let bias = STYLE_CONFIG[profile.coachStyle].repBias;
  // Persönliche Vorliebe verschiebt das Ziel innerhalb des Bereichs.
  if (profile.preferredRepStyle === "low") bias -= 2;
  if (profile.preferredRepStyle === "high") bias += 2;
  return Math.round(Math.min(g.repHigh, Math.max(g.repLow, mid + bias)));
}

/* ---------------- Alters-/Erfahrungs-Modifikatoren ---------------- */

// Mit dem Alter wird konservativer gesteigert und mehr Aufwärmen empfohlen.
// Gibt einen Faktor (1 = neutral, <1 = vorsichtiger) auf die Laststeigerung.
export function ageStepModifier(profile: CoachProfile): number {
  const a = age(profile);
  if (a === null) return 1;
  if (a >= 55) return 0.65;
  if (a >= 45) return 0.8;
  if (a >= 35) return 0.92;
  return 1;
}

// Effektive Schrittweite (% Laststeigerung) inkl. Erfahrung & Alter.
function effectiveStep(profile: CoachProfile): number {
  const style = STYLE_CONFIG[profile.coachStyle];
  return (
    style.stepPct * EXPERIENCE_FACTOR[profile.experience] * ageStepModifier(profile)
  );
}

// Empfehlung für den nächsten Arbeitssatz auf Basis des aktuellen e1RM.
export function recommendSet(
  oneRm: number,
  profile: CoachProfile,
): SetRecommendation {
  const reps = targetReps(profile);
  const rir = STYLE_CONFIG[profile.coachStyle].rir;
  if (oneRm <= 0) {
    return { weight: 0, reps, rir, intensityPct: 0, hasBaseline: false };
  }
  // Last, die `reps + rir` Maximal-Wiederholungen erlaubt → bei `reps` bleibt
  // die geplante Reserve übrig.
  const raw = weightForReps(oneRm, reps + rir);
  const weight = roundToIncrement(raw);
  const intensityPct = Math.round((weight / oneRm) * 100);
  return { weight, reps, rir, intensityPct, hasBaseline: true };
}

/* ---------------- Autoregulation nach einem Satz ---------------- */

export type Adjustment = {
  nextWeight: number;
  nextReps: number;
  newE1RM: number; // ggf. nach oben verschoben
  pr: boolean; // neues geschätztes 1RM (Grenze verschoben)
  tone: "push" | "hold" | "back" | "limit";
  message: string;
};

// Wertet den gerade abgeschlossenen Satz aus und plant den nächsten.
export function autoregulate(
  done: SetLike,
  oneRm: number,
  profile: CoachProfile,
): Adjustment {
  const style = STYLE_CONFIG[profile.coachStyle];
  const tgtReps = targetReps(profile);
  const achieved = e1rm(done.weight, done.reps);
  const newE1RM = Math.max(oneRm, achieved);
  const pr = achieved > oneRm + 0.01 && done.weight > 0;
  const step = 1 + effectiveStep(profile);

  const rpe = done.rpe ?? null;
  const beatBy = done.reps - tgtReps;
  const lightRpe = rpe !== null && rpe <= style.pushRpe - 1;
  const hardRpe = rpe !== null && rpe >= 9.5;

  // RPE dominiert, wenn vorhanden: ein sehr schwerer Satz (RPE ~10) trotz
  // erreichter Wiederholungen heißt "Gewicht halten", nicht steigern.
  if (rpe !== null && rpe >= 9.5 && done.weight > 0) {
    return {
      nextWeight: done.weight,
      nextReps: tgtReps,
      newE1RM,
      pr,
      tone: "hold",
      message:
        `RPE ${rpe} – das war fast alles. Beim nächsten Satz gleiches Gewicht ` +
        `(${done.weight} kg) und sauber für ${tgtReps} Wdh halten.`,
    };
  }

  // Deutliche Reserve → Limit-Test anbieten.
  if ((beatBy >= 2 || lightRpe) && done.weight > 0 && !hardRpe) {
    const nextWeight = roundToIncrement(done.weight * step);
    const prefix = pr ? "Neues geschätztes Maximum! " : "";
    return {
      nextWeight,
      nextReps: tgtReps,
      newE1RM,
      pr,
      tone: "limit",
      message:
        `${prefix}Da ist noch Luft — beim nächsten Satz ${nextWeight} kg. ` +
        `Geh ans Limit und schau, wie weit du kommst.`,
    };
  }

  // Im oder leicht über Ziel → leicht steigern.
  if (beatBy >= 0 && !hardRpe && done.weight > 0) {
    const nextWeight = roundToIncrement(done.weight * step);
    if (nextWeight > done.weight) {
      return {
        nextWeight,
        nextReps: tgtReps,
        newE1RM,
        pr,
        tone: "push",
        message:
          `Sauber, ${done.reps} Wdh geschafft. Trau dich an ${nextWeight} kg — ` +
          `ich glaub, die ${tgtReps} liegen drin.`,
      };
    }
    return {
      nextWeight: done.weight,
      nextReps: tgtReps,
      newE1RM,
      pr,
      tone: "hold",
      message: `Im Zielbereich. Gewicht halten: ${done.weight} kg × ${tgtReps}.`,
    };
  }

  // Knapp unter Ziel, aber sauber → Gewicht halten und nachlegen.
  if (beatBy === -1 && !hardRpe && done.weight > 0) {
    return {
      nextWeight: done.weight,
      nextReps: tgtReps,
      newE1RM,
      pr,
      tone: "hold",
      message: `Knapp dran — eine Wdh fehlt. Gleiches Gewicht (${done.weight} kg), hol dir die ${tgtReps}.`,
    };
  }

  // Deutlich unter Ziel oder sehr schwer → zurücknehmen.
  const nextWeight = roundToIncrement(
    done.weight * (1 - style.stepPct),
  );
  return {
    nextWeight: nextWeight > 0 ? nextWeight : done.weight,
    nextReps: tgtReps,
    newE1RM,
    pr,
    tone: "back",
    message:
      `Das war hart. Nächster Satz etwas leichter (${
        nextWeight > 0 ? nextWeight : done.weight
      } kg) und sauber für ${tgtReps} Wdh.`,
  };
}

/* ---------------- Live-Reaktion auf eingegebenes Gewicht ---------------- */

export type LiveReaction = {
  tone: "info" | "bold" | "caution";
  message: string;
} | null;

// Reagiert, während die Person mitten in der Übung ein Gewicht einträgt.
export function liveReaction(
  enteredWeight: number,
  oneRm: number,
  profile: CoachProfile,
): LiveReaction {
  if (enteredWeight <= 0 || oneRm <= 0) return null;
  const rec = recommendSet(oneRm, profile);
  const ratio = enteredWeight / oneRm;
  const predReps = repsForWeight(oneRm, enteredWeight);

  // Nahe am oder über dem geschätzten Maximum.
  if (ratio >= 0.97) {
    return {
      tone: "caution",
      message:
        `${enteredWeight} kg liegt an deinem geschätzten Maximum (${Math.round(
          oneRm,
        )} kg). Nur sauber und mit Sicherung — aber genau hier verschiebst du deine Grenze.`,
    };
  }
  // Deutlich schwerer als empfohlen → anfeuern.
  if (enteredWeight > rec.weight * 1.02) {
    return {
      tone: "bold",
      message:
        `Mutig! Bei ${enteredWeight} kg trau ich dir ~${predReps} Wdh zu. ` +
        `Zeig, was geht — ich zähl mit.`,
    };
  }
  // Deutlich leichter als empfohlen → mehr fordern.
  if (enteredWeight < rec.weight * 0.92) {
    return {
      tone: "info",
      message: `Da geht mehr. Für echten Reiz: ${rec.weight} kg × ${rec.reps}.`,
    };
  }
  return null;
}

export function age(profile: CoachProfile): number | null {
  if (!profile.birthYear) return null;
  return new Date().getFullYear() - profile.birthYear;
}

/* ---------------- Aufwärm-Plan ---------------- */

export type WarmupSet = { weight: number; reps: number; pct: number };

// Aufwärmsätze als Rampe zum Arbeitsgewicht. Ältere/Schwerere Lasten →
// mehr Aufwärmsätze. Bei kleinen Lasten (Körpergewicht-nah) leer.
export function warmupPlan(
  workWeight: number,
  profile: CoachProfile,
): WarmupSet[] {
  if (workWeight < 20) return []; // zu leicht für separates Aufwärmen
  const a = age(profile);
  const heavy = profile.goal === "strength";
  // Prozentschritte vom Arbeitsgewicht.
  let steps = heavy ? [0.4, 0.6, 0.8] : [0.5, 0.75];
  if ((a !== null && a >= 45) || heavy) steps = [0.4, 0.55, 0.7, 0.85];
  return steps.map((pct) => ({
    pct: Math.round(pct * 100),
    weight: roundToIncrement(workWeight * pct),
    reps: pct < 0.55 ? 8 : pct < 0.75 ? 5 : 3,
  }));
}

/* ---------------- Pausen-Empfehlung ---------------- */

// Empfohlene Satzpause in Sekunden, abhängig von Ziel & Stil.
export function recommendedRest(profile: CoachProfile): number {
  const base =
    profile.goal === "strength"
      ? 180
      : profile.goal === "hypertrophy"
        ? 105
        : 60; // endurance
  // Aggressiver Stil drückt etwas kürzer (Dichte), vorsichtig etwas länger.
  const adj =
    profile.coachStyle === "aggressive"
      ? -15
      : profile.coachStyle === "cautious"
        ? 20
        : 0;
  return Math.max(45, base + adj);
}

/* ---------------- Session-/Bereitschafts-Hinweise ---------------- */

// Kontextueller Hinweis zu Beginn/auf der Übungsebene – nutzt erweiterte Daten.
export function sessionAdvice(profile: CoachProfile): string[] {
  const tips: string[] = [];
  const a = age(profile);
  if (a !== null && a >= 45) {
    tips.push(
      "Nimm dir heute extra Zeit zum Aufwärmen – Gelenke danken es dir.",
    );
  }
  if (profile.limitations.trim()) {
    tips.push(
      `Beachte deine Einschränkung (${profile.limitations.trim()}) – bei Schmerz sofort abbrechen.`,
    );
  }
  if (profile.trainingDaysPerWeek && profile.trainingDaysPerWeek >= 5) {
    tips.push(
      "Bei 5+ Einheiten/Woche zählt Erholung: Schlaf und Protein im Blick behalten.",
    );
  }
  if (profile.goal === "strength") {
    tips.push("Kraftfokus: lieber sauberere, schwere Sätze als viele Wdh.");
  }
  return tips;
}

// Prüft, ob das Equipment einer Übung mit dem verfügbaren Equipment passt.
// Leere availableEquipment-Liste = alles verfügbar.
export function hasEquipment(
  profile: CoachProfile,
  equipmentSlug: string | null,
): boolean {
  const avail = profile.availableEquipment
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (avail.length === 0) return true;
  if (!equipmentSlug) return true; // Körpergewicht o. Ä.
  return avail.includes(equipmentSlug);
}

/* ---------------- RPE-Hilfen ---------------- */

// Kurzbeschreibung eines RPE-Werts für die UI.
export function rpeLabel(rpe: number): string {
  if (rpe >= 10) return "Maximal – keine Wdh mehr möglich";
  if (rpe >= 9) return "Sehr schwer – 1 Wdh in Reserve";
  if (rpe >= 8) return "Schwer – 2 Wdh in Reserve";
  if (rpe >= 7) return "Fordernd – 3 Wdh in Reserve";
  return "Leicht – viel Reserve";
}
