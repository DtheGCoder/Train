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

/* ---------------- Kontext: Verlauf & Session-Zustand ---------------- */
// Damit der Coach „mitdenkt" statt jeden Satz dasselbe zu sagen, bekommt er
// zwei Kontexte: den Übungs-VERLAUF (vergangene Einheiten) und den aktuellen
// SESSION-Zustand (was in dieser Einheit schon abgehakt wurde). Beides wird
// serverseitig aus der DB geladen und live mitgeführt.

// Eine vergangene Einheit dieser Übung (chronologisch aufsteigend geliefert).
export type HistorySession = {
  date: string; // ISO
  bestE1RM: number; // bestes geschätztes 1RM dieser Einheit
  topWeight: number; // schwerstes bewegtes Arbeitsgewicht
  topReps: number; // Wdh beim schwersten Satz
  workSets: number; // Anzahl Arbeitssätze
};

export type ExerciseHistory = { sessions: HistorySession[] };

// Live-Zustand der Übung in DIESER Einheit (vor dem aktuellen Satz).
export type SessionState = {
  completed: SetLike[]; // bereits abgehakte Arbeitssätze, chronologisch
  plannedSets: number; // geplante Arbeitssätze gesamt
};

export type HistoryStatus = "new" | "rising" | "flat" | "regressing" | "stalled";

export type HistoryInsight = {
  status: HistoryStatus;
  lastBestE1RM: number;
  prevBestE1RM: number;
  sessionsSinceProgress: number; // Einheiten seit letztem Bestwert
  changePct: number; // Veränderung letzte vs. vorletzte Einheit
  sessionCount: number;
};

// Wertet den Verlauf einer Übung aus: steigt, stagniert, fällt oder Plateau?
export function analyzeExerciseHistory(
  history: ExerciseHistory | undefined,
): HistoryInsight {
  const s = history?.sessions ?? [];
  if (s.length === 0) {
    return {
      status: "new",
      lastBestE1RM: 0,
      prevBestE1RM: 0,
      sessionsSinceProgress: 0,
      changePct: 0,
      sessionCount: 0,
    };
  }
  const last = s[s.length - 1];
  const prev = s.length >= 2 ? s[s.length - 2] : null;
  let best = 0;
  let bestIdx = 0;
  s.forEach((x, i) => {
    if (x.bestE1RM > best) {
      best = x.bestE1RM;
      bestIdx = i;
    }
  });
  const sessionsSinceProgress = s.length - 1 - bestIdx;
  const changePct =
    prev && prev.bestE1RM > 0
      ? ((last.bestE1RM - prev.bestE1RM) / prev.bestE1RM) * 100
      : 0;

  let status: HistoryStatus;
  if (s.length === 1) status = "new";
  else if (changePct <= -2.5) status = "regressing";
  else if (sessionsSinceProgress >= 3) status = "stalled";
  else if (changePct >= 1.5) status = "rising";
  else status = "flat";

  return {
    status,
    lastBestE1RM: last.bestE1RM,
    prevBestE1RM: prev?.bestE1RM ?? 0,
    sessionsSinceProgress,
    changePct,
    sessionCount: s.length,
  };
}

// Grobe innersatz-Ermüdung: ab dem 2. Arbeitssatz sinkt die Wdh-Kapazität.
// (~0,6 Wdh je bereits absolviertem Arbeitssatz – konservativ.)
function fatigueReps(completedSets: number): number {
  return Math.floor(completedSets * 0.6);
}

// Deterministische Phrasen-Auswahl (variiert Wortlaut je Satz, ohne Zufall).
function pick(arr: string[], seed: number): string {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

/* ---------------- Empfehlung für den nächsten Satz (kontext-bewusst) ---------------- */

// Plant den nächsten Arbeitssatz UNTER Berücksichtigung von Verlauf und bereits
// absolvierten Sätzen dieser Einheit. Folgesätze halten das Gewicht und planen
// wegen Ermüdung etwas weniger Wdh – statt stur weiter hochzurechnen.
export function recommendNextSet(
  oneRm: number,
  profile: CoachProfile,
  ctx: { state: SessionState; insight: HistoryInsight },
): SetRecommendation {
  const base = recommendSet(oneRm, profile);
  if (!base.hasBaseline) return base;
  const { state, insight } = ctx;
  const tgt = targetReps(profile);
  const repLow = GOAL_CONFIG[profile.goal].repLow;

  // Erster Arbeitssatz: am Verlauf ausrichten.
  if (state.completed.length === 0) {
    if (insight.status === "regressing") {
      // Nach rückläufigen Einheiten konservativ einsteigen (Technik vor Last).
      const weight = roundToIncrement(base.weight * 0.975);
      return {
        ...base,
        weight,
        intensityPct: oneRm > 0 ? Math.round((weight / oneRm) * 100) : 0,
      };
    }
    return base;
  }

  // Folgesätze: Gewicht des letzten Arbeitssatzes halten, Wdh-Ziel wegen
  // Ermüdung leicht senken (nicht stur weiter steigern).
  const lastSet = state.completed[state.completed.length - 1];
  const weight = lastSet.weight > 0 ? lastSet.weight : base.weight;
  const reps = Math.max(repLow, tgt - fatigueReps(state.completed.length));
  return {
    weight,
    reps,
    rir: base.rir,
    intensityPct: oneRm > 0 ? Math.round((weight / oneRm) * 100) : 0,
    hasBaseline: true,
  };
}

/* ---------------- Auswertung nach einem Satz (kontext-bewusst) ---------------- */

export type Adjustment = {
  nextWeight: number;
  nextReps: number;
  newE1RM: number; // ggf. nach oben verschoben
  pr: boolean; // neues geschätztes 1RM (Grenze verschoben)
  tone: "push" | "hold" | "back" | "limit" | "done";
  message: string;
};

// Bewertet den gerade abgeschlossenen Satz und plant den nächsten – mit Blick
// auf Satz-Nummer, Ermüdung in dieser Einheit und den Verlauf der Übung.
// Wichtig: drängt NICHT bei jedem Satz „geh ans Limit". Ein Limit-/Mehrlast-
// Vorschlag kommt nur dann, wenn er Sinn ergibt (frischer 1. Satz mit klarer
// Reserve oder ein echtes Plateau, das man durchbrechen sollte).
export function coachAfterSet(
  done: SetLike,
  oneRm: number,
  profile: CoachProfile,
  ctx: { state: SessionState; insight: HistoryInsight },
): Adjustment {
  const { state, insight } = ctx;
  const style = STYLE_CONFIG[profile.coachStyle];
  const tgt = targetReps(profile);
  const achieved = e1rm(done.weight, done.reps);
  const newE1RM = Math.max(oneRm, achieved);
  const pr = achieved > oneRm + 0.01 && done.weight > 0;
  const step = 1 + effectiveStep(profile);

  const rpe = done.rpe ?? null;
  const beatBy = done.reps - tgt;
  const hardRpe = rpe !== null && rpe >= 9.5;
  const toughRpe = rpe !== null && rpe >= style.pushRpe;
  const easyRpe = rpe !== null && rpe <= style.pushRpe - 2;

  const setNo = state.completed.length + 1; // dieser Arbeitssatz
  const remaining = Math.max(0, state.plannedSets - setNo);
  const isFirst = setNo === 1;
  const hold = done.weight; // gleiches Gewicht

  // Verlaufs-Zusatz nur beim 1. Satz (sonst wird's repetitiv).
  let historyNote = "";
  if (isFirst) {
    if (insight.status === "rising")
      historyNote = ` Dein Trend zeigt nach oben (+${Math.round(insight.changePct)}% zuletzt) — bestätige das.`;
    else if (insight.status === "regressing")
      historyNote = ` Die letzten Einheiten gingen leicht runter — heute nichts erzwingen, sauber arbeiten.`;
    else if (insight.status === "stalled")
      historyNote = ` Seit ${insight.sessionsSinceProgress} Einheiten kein neuer Bestwert — Zeit, das Plateau gezielt anzugreifen.`;
  }

  // 1) Neuer geschätzter Bestwert → feiern, danach Ermüdung respektieren.
  if (pr) {
    return {
      nextWeight: hold,
      nextReps: tgt,
      newE1RM,
      pr: true,
      tone: "push",
      message:
        `Neuer geschätzter Bestwert — ${done.weight} kg × ${done.reps}! ` +
        (remaining > 0
          ? `Folgesätze bei ${hold} kg halten, die Marke ist gesetzt.`
          : `Stark beendet.`) +
        historyNote,
    };
  }

  // 2) Sehr schwer (RPE ≥ 9,5) → halten/zurücknehmen, niemals nachlegen.
  if (hardRpe) {
    if (remaining === 0) {
      return {
        nextWeight: hold,
        nextReps: tgt,
        newE1RM,
        pr,
        tone: "hold",
        message: pick(
          [
            `RPE ${rpe} zum Abschluss — alles gegeben, genau richtig.`,
            `Das war Maximaleinsatz (RPE ${rpe}). Sauberer Schlusspunkt.`,
          ],
          setNo,
        ),
      };
    }
    const lighter = roundToIncrement(done.weight * (1 - style.stepPct));
    return {
      nextWeight: lighter > 0 ? lighter : hold,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "hold",
      message:
        `RPE ${rpe} – fast am Anschlag. Für die ${remaining} Restsätze ${hold} kg halten` +
        (lighter < done.weight ? ` oder auf ${lighter} kg runter` : "") +
        `, Form geht vor. Nicht erzwingen.`,
    };
  }

  // 3) Frischer 1. Satz mit klarer Reserve → EINMALIG mehr Last anbieten.
  //    (Nur hier wird „mehr" vorgeschlagen – nicht bei jedem Folgesatz.)
  if (isFirst && (beatBy >= 3 || easyRpe) && done.weight > 0) {
    const heavier = roundToIncrement(done.weight * step);
    if (insight.status === "stalled") {
      return {
        nextWeight: heavier,
        nextReps: Math.max(GOAL_CONFIG[profile.goal].repLow, tgt - 1),
        newE1RM,
        pr,
        tone: "limit",
        message:
          `Locker mit Reserve — und das Plateau will gebrochen werden. ` +
          `Nächster Satz ${heavier} kg, geh kontrolliert ans Limit.` +
          historyNote,
      };
    }
    return {
      nextWeight: heavier,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "push",
      message:
        pick(
          [
            `Satz 1 saß locker (${done.reps} Wdh). Leg auf ${heavier} kg nach.`,
            `Da war klar Reserve. Trau dich an ${heavier} kg für die nächsten Sätze.`,
          ],
          setNo,
        ) + historyNote,
    };
  }

  // 4) Im/über Ziel mit Reserve, aber kein frischer 1. Satz → Gewicht HALTEN.
  //    Ermüdung über die Sätze ist normal und gewollt – nicht weiter hochjagen.
  if (beatBy >= 0 && !toughRpe && done.weight > 0) {
    return {
      nextWeight: hold,
      nextReps: Math.max(
        GOAL_CONFIG[profile.goal].repLow,
        tgt - fatigueReps(setNo),
      ),
      newE1RM,
      pr,
      tone: "hold",
      message:
        remaining > 0
          ? pick(
              [
                `Sauber, ${done.reps} Wdh. Gleiches Gewicht halten — noch ${remaining} ${remaining === 1 ? "Satz" : "Sätze"}.`,
                `Sitzt. ${hold} kg beibehalten, Form sauber halten. Noch ${remaining} zu gehen.`,
                `Gut kontrolliert. Bei ${hold} kg bleiben, Ermüdung ist eingeplant.`,
              ],
              setNo,
            ) + historyNote
          : `Letzter Satz sauber im Ziel — gut gemacht.` + historyNote,
    };
  }

  // 5) Im Ziel, aber schon fordernd (RPE am Push-Level) → halten.
  if (beatBy >= 0 && done.weight > 0) {
    return {
      nextWeight: hold,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "hold",
      message:
        remaining > 0
          ? `Im Ziel und fordernd (RPE ${rpe}). ${hold} kg halten — genau die richtige Dosis.`
          : `Im Ziel abgeschlossen, ordentlich gefordert.`,
    };
  }

  // 6) Eine Wdh unter Ziel → späte Sätze: normal (Ermüdung), frühe: dranbleiben.
  if (beatBy === -1 && done.weight > 0) {
    return {
      nextWeight: hold,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "hold",
      message:
        setNo >= 3
          ? `Eine Wdh unter Ziel — nach ${setNo} Sätzen völlig normal. ${hold} kg halten.`
          : `Knapp dran, eine Wdh fehlt. ${hold} kg halten und die ${tgt} holen.`,
    };
  }

  // 7) Deutlich unter Ziel / sehr zäh → Last reduzieren.
  const lighter = roundToIncrement(done.weight * (1 - style.stepPct));
  return {
    nextWeight: lighter > 0 ? lighter : hold,
    nextReps: tgt,
    newE1RM,
    pr,
    tone: "back",
    message:
      (setNo >= 3
        ? `Die Kraft lässt nach — normal so spät. `
        : `Heute zäh bei dem Gewicht. `) +
      `Nächster Satz ${lighter > 0 ? lighter : hold} kg, sauber für ${tgt} Wdh.`,
  };
}

/* ---------------- Live-Reaktion auf eingegebenes Gewicht ---------------- */

export type LiveReaction = {
  tone: "info" | "bold" | "caution";
  message: string;
} | null;

// Reagiert, während die Person mitten in der Übung ein Gewicht einträgt.
// Kennt den Session-Zustand: bei Folgesätzen wird nicht mehr „da geht mehr"
// gefordert (Ermüdung), und ein bewusst gehaltenes Gewicht wird nicht kritisiert.
export function liveReaction(
  enteredWeight: number,
  oneRm: number,
  profile: CoachProfile,
  ctx?: { state: SessionState; insight: HistoryInsight },
): LiveReaction {
  if (enteredWeight <= 0 || oneRm <= 0) return null;
  const rec = ctx
    ? recommendNextSet(oneRm, profile, ctx)
    : recommendSet(oneRm, profile);
  const ratio = enteredWeight / oneRm;
  const predReps = repsForWeight(oneRm, enteredWeight);
  const isFollowUp = (ctx?.state.completed.length ?? 0) > 0;

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
  // Folgesatz: gehaltenes/leicht reduziertes Gewicht ist gewollt → nicht nörgeln.
  if (isFollowUp) {
    if (enteredWeight > rec.weight * 1.08) {
      return {
        tone: "caution",
        message:
          `${enteredWeight} kg ist für einen Folgesatz ambitioniert — die Ermüdung läuft mit. ` +
          `Wenn die Form hält, gern; sonst ${rec.weight} kg.`,
      };
    }
    return null;
  }
  // 1. Satz, deutlich schwerer als empfohlen → anfeuern.
  if (enteredWeight > rec.weight * 1.02) {
    return {
      tone: "bold",
      message:
        `Mutig! Bei ${enteredWeight} kg trau ich dir ~${predReps} Wdh zu. ` +
        `Zeig, was geht — ich zähl mit.`,
    };
  }
  // 1. Satz, deutlich leichter als empfohlen → mehr fordern.
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
// Deckt möglichst viele Eventualitäten ab (Alter, Einschränkungen, Frequenz,
// Ziel, Erfahrung, Equipment) und priorisiert die wichtigsten Hinweise zuerst.
export function sessionAdvice(profile: CoachProfile): string[] {
  const tips: string[] = [];
  const a = age(profile);

  // Sicherheit zuerst: Einschränkungen und Alter.
  if (profile.limitations.trim()) {
    tips.push(
      `Beachte deine Einschränkung (${profile.limitations.trim()}) – bei Schmerz sofort abbrechen.`,
    );
  }
  if (a !== null && a >= 55) {
    tips.push(
      "Ab 55+: lange aufwärmen, Technik vor Last, und keine Maximalversuche ohne Sicherung.",
    );
  } else if (a !== null && a >= 45) {
    tips.push("Nimm dir heute extra Zeit zum Aufwärmen – Gelenke danken es dir.");
  }

  // Erfahrung.
  if (profile.experience === "beginner") {
    tips.push(
      "Als Einsteiger: sauberer Bewegungsablauf schlägt schweres Gewicht. Lieber eine Wdh in Reserve.",
    );
  } else if (profile.experience === "advanced") {
    tips.push(
      "Erfahren: Fortschritt kommt jetzt in kleinen Schritten – Mikro-Steigerungen und Variation zählen.",
    );
  }

  // Frequenz / Erholung.
  if (profile.trainingDaysPerWeek && profile.trainingDaysPerWeek >= 5) {
    tips.push(
      "Bei 5+ Einheiten/Woche zählt Erholung: Schlaf, Protein und alle 4–6 Wochen ein Deload.",
    );
  } else if (profile.trainingDaysPerWeek && profile.trainingDaysPerWeek <= 2) {
    tips.push(
      "Bei 1–2 Einheiten/Woche: setz auf Grundübungen (Ganzkörper), die viel auf einmal treffen.",
    );
  }

  // Ziel.
  if (profile.goal === "strength") {
    tips.push("Kraftfokus: lieber sauberere, schwere Sätze als viele Wdh – und längere Pausen.");
  } else if (profile.goal === "hypertrophy") {
    tips.push("Muskelaufbau: jeden Arbeitssatz nah ans Limit (1–3 Wdh Reserve), Volumen über die Woche steuern.");
  } else if (profile.goal === "endurance") {
    tips.push("Kraftausdauer: kurze Pausen halten den Reiz – Tempo und saubere Form trotzdem behalten.");
  }

  // Equipment-Einschränkung.
  if (profile.availableEquipment.trim()) {
    tips.push("Begrenztes Equipment: nutze Tempo, Pausen und Wdh, um den Reiz trotzdem hoch zu halten.");
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

/* ---------------- Abschluss-Fazit (nach dem Workout) ---------------- */

// Zusammenfassung einer abgeschlossenen Übung dieser Einheit.
export type WorkoutExerciseSummary = {
  name: string;
  workSets: number; // abgehakte Arbeitssätze (ohne Aufwärmen)
  topWeight: number; // schwerstes bewegtes Arbeitsgewicht
  topReps: number; // Wdh beim schwersten Satz
  sessionE1RM: number; // bestes geschätztes 1RM NUR dieser Einheit
  baselineE1RM: number; // bestes geschätztes 1RM davor (Historie)
  status: HistoryStatus; // Trend laut Verlauf
};

export type WorkoutSummaryInput = {
  exercises: WorkoutExerciseSummary[];
  totalVolume: number;
  totalSets: number; // abgehakte Sätze gesamt
  durationSec: number;
};

export type WorkoutSummary = {
  headline: string;
  notes: string[];
};

// Schonungslos ehrliches, aber motivierendes Kurz-Fazit des Coaches zum
// gesamten Training: hebt neue Schätz-Bestwerte hervor, benennt Fortschritt
// genauso wie Stagnation – im Tonfall des gewählten Coach-Stils. Deterministisch.
export function coachWorkoutSummary(
  input: WorkoutSummaryInput,
  profile: CoachProfile,
): WorkoutSummary {
  const { exercises, totalSets } = input;
  const style = profile.coachStyle;

  // Gar nichts abgehakt: ehrlich ansprechen, nicht schönreden.
  if (totalSets === 0 || exercises.length === 0) {
    return {
      headline: "Beendet – aber kein Satz abgehakt.",
      notes: [
        "Kein abgeschlossener Arbeitssatz heute. Zählt trotzdem als Anwesenheit – beim nächsten Mal hak die Sätze ab, dann kann ich dich richtig steuern.",
      ],
    };
  }

  // Neue Schätz-Bestwerte (sessionE1RM klar über bisheriger Bestmarke).
  const prs = exercises
    .filter((e) => e.baselineE1RM > 0 && e.sessionE1RM > e.baselineE1RM * 1.005)
    .sort((a, b) => b.sessionE1RM - a.sessionE1RM);
  const debuts = exercises.filter((e) => e.baselineE1RM === 0 && e.workSets > 0);
  const rising = exercises.filter((e) => e.status === "rising");
  const stalling = exercises.filter(
    (e) => e.status === "stalled" || e.status === "regressing",
  );

  const notes: string[] = [];

  // 1) Bestwerte zuerst – die feiert der Coach.
  for (const e of prs.slice(0, 2)) {
    notes.push(
      `${e.name}: neuer Schätz-Bestwert – ~${Math.round(e.sessionE1RM)} kg (1RM) bei ${e.topWeight}×${e.topReps}.`,
    );
  }

  // 2) Aufwärtstrend ohne PR.
  if (prs.length === 0 && rising.length > 0) {
    notes.push(`${rising[0].name} zieht an – der Trend zeigt nach oben.`);
  }

  // 3) Ehrlich: Stagnation/Rückgang benennen (max. eine, die wichtigste).
  if (notes.length < 3 && stalling.length > 0) {
    const e = stalling[0];
    notes.push(
      e.status === "regressing"
        ? `${e.name} lag unter dem letzten Mal – kann Tagesform sein. Nächstes Mal genau hinsehen: Schlaf, Aufwärmen, Pausen.`
        : `${e.name} stagniert seit ein paar Einheiten. Zeit für einen kleinen Reizwechsel – Wdh, Tempo oder eine leichte Deload-Woche.`,
    );
  }

  // 4) Debüt-Übung(en) ohne Historie.
  if (notes.length < 3 && prs.length === 0 && debuts.length > 0) {
    notes.push(
      `${debuts[0].name} ist neu im Log – ab jetzt vergleiche ich jede Einheit dagegen.`,
    );
  }

  // Fallback, falls noch keine Notiz: solide Konstanz würdigen.
  if (notes.length === 0) {
    notes.push(
      "Sauber und konstant durchgezogen. Genau diese Wiederholbarkeit baut langfristig auf.",
    );
  }

  // Überschrift nach Lage + Coach-Stil.
  let headline: string;
  if (prs.length > 0) {
    headline =
      style === "aggressive"
        ? "Brutal stark – Rekord eingetütet. 🔥"
        : style === "cautious"
          ? "Sauber gearbeitet – und ein neuer Bestwert obendrauf."
          : "Stark – neuer Bestwert drin!";
  } else if (rising.length > 0) {
    headline = "Solide Einheit – es geht aufwärts.";
  } else if (stalling.length > 0) {
    headline =
      style === "aggressive"
        ? "Durchgezogen – aber heute kein Schritt nach vorn."
        : "Ordentlich durchgezogen – Fortschritt lässt noch auf sich warten.";
  } else {
    headline = "Sauber durchgezogen. Konstanz zahlt sich aus.";
  }

  return { headline, notes: notes.slice(0, 3) };
}
