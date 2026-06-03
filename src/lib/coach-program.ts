// Auto-Anpassungs-Engine für Coach-Programme — entscheidet pro Übung wie ein
// echter Coach: progressiv steigern (Doppelprogression), bei zu hoher Last/RPE
// halten, bei Plateau entlasten oder (Isolation) gegen eine frische Variante
// tauschen. Reine Logik (keine DB) — die Anwendung passiert in actions.ts.

import {
  type CoachProfile,
  type ExerciseHistory,
  analyzeExerciseHistory,
  repRange,
  loadIncrement,
  ageStepModifier,
  roundToIncrement,
} from "./coach";

// Stil-Parameter: wie groß die Sprünge sind und ab wann „zu schwer" gilt.
const STYLE = {
  cautious: { stepMult: 0.7, hardRpe: 9.0, easyRpe: 6.5, deloadPct: 0.12 },
  balanced: { stepMult: 1.0, hardRpe: 9.5, easyRpe: 7.0, deloadPct: 0.1 },
  aggressive: { stepMult: 1.3, hardRpe: 10.0, easyRpe: 7.5, deloadPct: 0.08 },
} as const;

// Zusammenfassung der gerade beendeten Einheit für eine Übung.
export type DaySession = {
  topWeight: number; // schwerstes Arbeitsgewicht (0 = Körpergewicht)
  avgRpe: number | null; // mittlerer RPE der Arbeitssätze, falls erfasst
  hitTarget: boolean; // alle Arbeitssätze ≥ Ziel-Wdh
};

export type ExerciseInput = {
  routineExerciseId: string;
  exerciseId: string;
  name: string;
  mechanic: string; // compound | isolation
  targetReps: number;
  history: ExerciseHistory; // inkl. der gerade beendeten Einheit als letzte
};

export type CoachAction =
  | { kind: "progress-weight"; weight: number; reps: number }
  | { kind: "progress-reps"; weight: number; reps: number }
  | { kind: "hold"; weight: number; reps: number }
  | { kind: "reduce-weight"; weight: number; reps: number }
  | { kind: "swap" };

export type CoachLogKind = "progress" | "hold" | "reduce" | "swap";

export type CoachDecision = {
  routineExerciseId: string;
  exerciseId: string;
  name: string;
  action: CoachAction;
  message: string;
  logKind: CoachLogKind;
  needsDeload: boolean;
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function decideExercise(
  ex: ExerciseInput,
  session: DaySession,
  profile: CoachProfile,
): CoachDecision {
  const insight = analyzeExerciseHistory(ex.history);
  const style = STYLE[profile.coachStyle];
  const { low, high } = repRange(profile);
  const ageMod = ageStepModifier(profile);
  const top = session.topWeight;
  const bodyweight = top <= 0;
  const isCompound = ex.mechanic === "compound";
  const tooHard = session.avgRpe != null && session.avgRpe >= style.hardRpe;
  const easy = session.avgRpe != null && session.avgRpe <= style.easyRpe;

  const base = (
    action: CoachAction,
    message: string,
    logKind: CoachLogKind,
  ): CoachDecision => ({
    routineExerciseId: ex.routineExerciseId,
    exerciseId: ex.exerciseId,
    name: ex.name,
    action,
    message,
    logKind,
    needsDeload: insight.needsDeload,
  });

  // 1) Wiederholungen nicht erreicht → halten oder (bei rückläufigem Trend) senken.
  if (!session.hitTarget) {
    const persistent = insight.status === "regressing" || insight.needsDeload;
    if ((persistent || tooHard) && top > 0) {
      const w = roundToIncrement(top * (1 - style.deloadPct), 1.25);
      return base(
        { kind: "reduce-weight", weight: w, reps: low },
        `${ex.name}: Ziel-Wdh verfehlt und der Trend zeigt nach unten – ich nehme auf ${fmt(w)} kg zurück, damit du sauber und mit Reserve neu aufbaust.`,
        "reduce",
      );
    }
    return base(
      { kind: "hold", weight: top, reps: ex.targetReps },
      `${ex.name}: Ziel-Wdh nicht ganz geschafft – Gewicht bleibt, nächste Einheit neuer Anlauf.`,
      "hold",
    );
  }

  // 2) Hartnäckiges Plateau (kein Fortschritt über mehrere Einheiten) und NICHT
  // leicht → Isolation gegen frische Variante tauschen, Grundübung entlasten.
  // (War es zuletzt leicht, liegt es nicht an der Übung → unten weiter steigern.)
  if (insight.status === "stalled" && !easy) {
    if (!isCompound) {
      return base(
        { kind: "swap" },
        `${ex.name}: seit ${insight.sessionsSinceProgress} Einheiten kein Fortschritt – ich tausche gegen eine frische Variante für denselben Muskel.`,
        "swap",
      );
    }
    if (top > 0) {
      const w = roundToIncrement(top * (1 - style.deloadPct), 1.25);
      return base(
        { kind: "reduce-weight", weight: w, reps: low },
        `${ex.name}: hartnäckiges Plateau – Gewicht auf ${fmt(w)} kg zurück, um mit Schwung wieder hochzuarbeiten.`,
        "reduce",
      );
    }
  }

  // 3) Alle Wdh geschafft, aber sehr anstrengend → halten (Ermüdung steuern).
  if (tooHard) {
    return base(
      { kind: "hold", weight: top, reps: ex.targetReps },
      `${ex.name}: alle Wdh geschafft, aber grenzwertig schwer (RPE hoch) – Gewicht festigen statt überziehen.`,
      "hold",
    );
  }

  // 4) Fortschritt: Doppelprogression (erst Wdh in der Spanne, dann Last).
  if (bodyweight) {
    const add = easy ? 2 : 1;
    const reps = ex.targetReps + add;
    return base(
      { kind: "progress-reps", weight: 0, reps },
      `${ex.name}: stark – beim Körpergewicht erhöhe ich auf ${reps} Wiederholungen.`,
      "progress",
    );
  }

  if (ex.targetReps < high) {
    const add = easy ? 2 : 1;
    const reps = Math.min(high, ex.targetReps + add);
    return base(
      { kind: "progress-reps", weight: top, reps },
      `${ex.name}: sauber – Wiederholungen hoch auf ${reps} (Ziel ${low}–${high}), Gewicht bleibt bei ${fmt(top)} kg.`,
      "progress",
    );
  }

  // Obere Wdh-Grenze erreicht → Last erhöhen, Wdh auf untere Grenze zurück.
  let step = loadIncrement(top) * style.stepMult * ageMod;
  if (easy) step *= 1.5; // war auffällig leicht → größerer Sprung
  step = Math.max(1.25, roundToIncrement(step, 1.25));
  const newW = roundToIncrement(top + step, 1.25);
  return base(
    { kind: "progress-weight", weight: newW, reps: low },
    `${ex.name}: Wdh-Spanne voll ausgereizt – +${fmt(step)} kg auf ${fmt(newW)} kg, Wiederholungen zurück auf ${low}.`,
    "progress",
  );
}

/* ---------------- Makro-Entscheidung (Zyklus-Ende) ---------------- */

export type DeloadDecision = { deload: boolean; reason: string };

// Entscheidet beim Durchlauf-Ende, ob eine Deload-Woche fällig ist.
export function decideDeload(input: {
  cyclesDone: number;
  lastDeloadCycle: number;
  fatigueShare: number; // Anteil Übungen mit Entlastungs-Bedarf (0..1)
}): DeloadDecision {
  const since = input.cyclesDone - input.lastDeloadCycle;
  if (input.fatigueShare >= 0.4 && input.cyclesDone >= 2) {
    return {
      deload: true,
      reason: `Viele Übungen zeigen Ermüdung (${Math.round(
        input.fatigueShare * 100,
      )} %). Ich lege eine leichtere Woche (Deload) ein – Gewichte runter, damit Körper und Gelenke sich erholen.`,
    };
  }
  if (since >= 6) {
    return {
      deload: true,
      reason: `${since} Durchläufe ohne Pause – Zeit für eine geplante Deload-Woche, um frisch und stärker zurückzukommen.`,
    };
  }
  return { deload: false, reason: "" };
}

// Faktor, um den die Lasten in einer Deload-Woche reduziert werden.
export const DELOAD_FACTOR = 0.6;
