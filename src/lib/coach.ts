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

/* ---------------- 1RM-Mathematik (RPE-bewusst, gemittelt) ---------------- */

// Reps in Reserve aus RPE: RPE 10 ⇒ 0 (Versagen), 9 ⇒ 1, 8 ⇒ 2 … Halbe Stufen
// (z. B. 8,5 ⇒ 1,5) sind erlaubt. Ohne RPE-Angabe nehmen wir konservativ 0 an.
export function rirFromRpe(rpe: number): number {
  return Math.max(0, Math.min(6, 10 - rpe));
}

// Geschätztes 1RM aus einem Satz. Mittelt Epley und Brzycki (robuster als eine
// einzelne Formel) und DECKELT die Wiederholungen bei 12: jenseits davon
// überschätzen alle 1RM-Formeln stark – ein „20er-Satz" sagt wenig über das
// echte Maximum. Bewusst RPE-frei (für Verlaufswerte ohne RPE); die
// RPE-bewusste Variante ist e1rmRpe().
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, 12);
  const epley = weight * (1 + r / 30);
  const brzycki = weight * (36 / (37 - r));
  return (epley + brzycki) / 2;
}

// 1RM-Schätzung INKL. RPE: ein nicht bis zum Versagen geführter Satz hat
// Reserve-Wiederholungen – das echte Maximum liegt höher. Die Reserve wird auf
// die Wiederholungen addiert (5×100 kg @ RPE 8 ⇒ wie ein 7RM).
export function e1rmRpe(
  weight: number,
  reps: number,
  rpe?: number | null,
): number {
  const rir = rpe != null ? rirFromRpe(rpe) : 0;
  return e1rm(weight, reps + rir);
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

// Sinnvolle kleinste Laststeigerung je Gewichtsbereich: kleine Lasten /
// Isolation in feineren Schritten, schwere Grundübungen gröber. So bekommt der
// Coach realistische, im Studio umsetzbare Sprünge (Hantelscheiben).
export function loadIncrement(weight: number): number {
  if (weight < 40) return 1.25;
  if (weight < 100) return 2.5;
  return 5;
}

/* ---------------- e1RM aus Historie ---------------- */

// Bestes geschätztes 1RM über eine Menge an Sätzen – RPE-bewusst, wenn vorhanden.
export function bestE1RM(sets: SetLike[]): number {
  let best = 0;
  for (const s of sets) {
    const v = e1rmRpe(s.weight, s.reps, s.rpe ?? undefined);
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
  repLow: number; // untere Grenze der Ziel-Wdh-Spanne (Doppelprogression)
  repHigh: number; // obere Grenze – ab hier nächste Einheit Last erhöhen
};

// Ziel-Wiederholungsspanne abhängig von Ziel + persönlicher Vorliebe.
// Grundlage der Doppelprogression: erst Wdh in der Spanne aufbauen, dann Last.
export function repRange(profile: CoachProfile): { low: number; high: number } {
  const g = GOAL_CONFIG[profile.goal];
  let low = g.repLow;
  let high = g.repHigh;
  if (profile.preferredRepStyle === "low") {
    low = Math.max(1, low - 2);
    high = Math.max(low + 2, high - 2);
  } else if (profile.preferredRepStyle === "high") {
    low += 2;
    high += 2;
  }
  return { low, high };
}

// Ein einzelner Ziel-Wert innerhalb der Spanne (für Plan-Vorgaben/Defaults).
export function targetReps(profile: CoachProfile): number {
  const { low, high } = repRange(profile);
  const mid = (low + high) / 2;
  const bias = STYLE_CONFIG[profile.coachStyle].repBias;
  return Math.round(Math.min(high, Math.max(low, mid + bias)));
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

// Realistische Last-Steigerung bei der Doppelprogression: Anfänger (lineare
// Progression, sofern nicht hochbetagt) machen den doppelten Mindestschritt,
// alle anderen den kleinstmöglichen – so wächst die Last in Studio-tauglichen
// Sprüngen, ohne zu überfordern.
function progressionJump(profile: CoachProfile, weight: number): number {
  const inc = loadIncrement(weight);
  const a = age(profile);
  const linear = profile.experience === "beginner" && (a === null || a < 55);
  return linear ? inc * 2 : inc;
}

// Empfehlung für den nächsten Arbeitssatz auf Basis des aktuellen e1RM.
export function recommendSet(
  oneRm: number,
  profile: CoachProfile,
): SetRecommendation {
  const { low, high } = repRange(profile);
  const reps = targetReps(profile);
  const rir = STYLE_CONFIG[profile.coachStyle].rir;
  if (oneRm <= 0) {
    return {
      weight: 0,
      reps,
      rir,
      intensityPct: 0,
      hasBaseline: false,
      repLow: low,
      repHigh: high,
    };
  }
  // Last so wählen, dass am unteren Ende der Spanne die geplante Reserve übrig
  // bleibt – dann ist Luft, die Wdh bis ans obere Ende aufzubauen, bevor die
  // Last steigt (Doppelprogression).
  const raw = weightForReps(oneRm, low + rir);
  const weight = roundToIncrement(raw, loadIncrement(raw));
  const intensityPct = Math.round((weight / oneRm) * 100);
  return { weight, reps, rir, intensityPct, hasBaseline: true, repLow: low, repHigh: high };
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
  slopePctPerSession: number; // geglätteter Trend (lin. Regression) je Einheit, %
  sessionCount: number;
  needsDeload: boolean; // hartnäckiges Plateau / Rückgang → Entlastung sinnvoll
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
      slopePctPerSession: 0,
      sessionCount: 0,
      needsDeload: false,
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

  // Geglätteter Trend statt nur „letzte vs. vorletzte": lineare Regression der
  // e1RM über die letzten bis zu 6 Einheiten, normiert auf % je Einheit. Das
  // ist robuster gegen einzelne Tagesform-Ausreißer.
  const window = s.slice(-6);
  const slopePctPerSession = (() => {
    const n = window.length;
    if (n < 2) return 0;
    const meanX = (n - 1) / 2;
    const meanY = window.reduce((a, x) => a + x.bestE1RM, 0) / n;
    let num = 0;
    let den = 0;
    window.forEach((x, i) => {
      num += (i - meanX) * (x.bestE1RM - meanY);
      den += (i - meanX) ** 2;
    });
    const slope = den > 0 ? num / den : 0;
    return meanY > 0 ? (slope / meanY) * 100 : 0;
  })();

  let status: HistoryStatus;
  if (s.length === 1) status = "new";
  else if (sessionsSinceProgress >= 3) status = "stalled";
  else if (changePct <= -2.5 || slopePctPerSession <= -1.2) status = "regressing";
  else if (slopePctPerSession >= 0.8 || changePct >= 1.5) status = "rising";
  else status = "flat";

  // Entlastung (Deload) empfehlen, wenn das Plateau hartnäckig ist oder es
  // trotz mehrerer Einheiten klar bergab geht – nicht schon beim ersten Knick.
  const needsDeload =
    s.length >= 4 &&
    ((status === "stalled" && sessionsSinceProgress >= 3) ||
      (status === "regressing" && slopePctPerSession <= -2));

  return {
    status,
    lastBestE1RM: last.bestE1RM,
    prevBestE1RM: prev?.bestE1RM ?? 0,
    sessionsSinceProgress,
    changePct,
    slopePctPerSession,
    sessionCount: s.length,
    needsDeload,
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
  const intensity = (w: number) =>
    oneRm > 0 ? Math.round((w / oneRm) * 100) : 0;

  // Erster Arbeitssatz: am Verlauf ausrichten.
  if (state.completed.length === 0) {
    if (insight.needsDeload) {
      // Hartnäckiges Plateau/Rückgang: bewusst entlasten (~10 % runter),
      // technisch sauber – das bricht das Plateau besser als noch mehr Last.
      const weight = roundToIncrement(base.weight * 0.9, loadIncrement(base.weight));
      return { ...base, weight, intensityPct: intensity(weight) };
    }
    if (insight.status === "regressing") {
      // Nach rückläufigen Einheiten konservativ einsteigen (Technik vor Last).
      const weight = roundToIncrement(base.weight * 0.975, loadIncrement(base.weight));
      return { ...base, weight, intensityPct: intensity(weight) };
    }
    return base;
  }

  // Folgesätze: Gewicht des letzten Arbeitssatzes halten, Wdh-Ziel wegen
  // Ermüdung leicht senken (nicht stur weiter steigern). Untergrenze ist das
  // untere Ende der Spanne – darunter lieber die Last reduzieren.
  const lastSet = state.completed[state.completed.length - 1];
  const weight = lastSet.weight > 0 ? lastSet.weight : base.weight;
  const reps = Math.max(base.repLow, base.repHigh - fatigueReps(state.completed.length));
  return {
    weight,
    reps,
    rir: base.rir,
    intensityPct: intensity(weight),
    hasBaseline: true,
    repLow: base.repLow,
    repHigh: base.repHigh,
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
  const { low, high } = repRange(profile);
  const tgt = targetReps(profile);

  // RPE-bewusste Auswertung: der Satz „zählt" für das e1RM mit Reserve.
  const rpe = done.rpe ?? null;
  const rir = rpe !== null ? rirFromRpe(rpe) : null;
  const achieved = e1rmRpe(done.weight, done.reps, rpe);
  const newE1RM = Math.max(oneRm, achieved);
  const pr = achieved > oneRm + 0.01 && done.weight > 0;

  const inc = loadIncrement(done.weight);
  const intensity = oneRm > 0 ? Math.round((done.weight / oneRm) * 100) : 0;
  const beatHigh = done.reps - high; // Wdh über/unter dem oberen Spannenende
  const hardRpe = rpe !== null && rpe >= 9.5;
  const toughRpe = rpe !== null && rpe >= style.pushRpe;
  // „Klare Reserve": entweder gemessen (RIR ≥ 2) oder, ohne RPE, deutlich über
  // dem oberen Spannenende.
  const clearReserve = rir !== null ? rir >= 2 : beatHigh >= 2;

  const setNo = state.completed.length + 1;
  const remaining = Math.max(0, state.plannedSets - setNo);
  const isFirst = setNo === 1;
  const hold = done.weight;
  const rpeTxt = rpe !== null ? ` (RPE ${rpe}, ~${rir} RIR)` : "";

  // Verlaufs-Zusatz nur beim 1. Satz (sonst wird's repetitiv).
  let historyNote = "";
  if (isFirst) {
    if (insight.needsDeload)
      historyNote = ` Seit ${insight.sessionsSinceProgress} Einheiten klemmt es — plan die nächste Woche als Deload (Last ~10 % runter, frisch zurückkommen).`;
    else if (insight.status === "rising")
      historyNote = ` Trend zeigt nach oben (${insight.slopePctPerSession >= 0 ? "+" : ""}${insight.slopePctPerSession.toFixed(1)} %/Einheit) — bestätige das.`;
    else if (insight.status === "regressing")
      historyNote = ` Zuletzt leicht rückläufig — heute nichts erzwingen, technisch sauber.`;
    else if (insight.status === "stalled")
      historyNote = ` Seit ${insight.sessionsSinceProgress} Einheiten kein Bestwert — gezielt am Plateau arbeiten.`;
  }

  // 1) Neuer geschätzter Bestwert → feiern, danach Ermüdung respektieren.
  if (pr) {
    return {
      nextWeight: hold,
      nextReps: Math.max(low, high - fatigueReps(setNo)),
      newE1RM,
      pr: true,
      tone: "push",
      message:
        `Neuer geschätzter Bestwert — ${done.weight} kg × ${done.reps}${rpeTxt}! ` +
        (remaining > 0
          ? `Folgesätze ${hold} kg halten, die Marke steht.`
          : `Stark beendet.`) +
        historyNote,
    };
  }

  // 2) Sehr schwer (RPE ≥ 9,5 / 0 RIR) → halten/zurücknehmen, nie nachlegen.
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
            `Maximaleinsatz (RPE ${rpe}). Sauberer Schlusspunkt.`,
          ],
          setNo,
        ),
      };
    }
    const lighter = roundToIncrement(done.weight * (1 - style.stepPct), inc);
    return {
      nextWeight: lighter > 0 && lighter < done.weight ? lighter : hold,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "hold",
      message:
        `RPE ${rpe} – am Anschlag. Für die ${remaining} Restsätze ${hold} kg halten` +
        (lighter < done.weight ? ` oder auf ${lighter} kg runter` : "") +
        `, Technik geht vor. Nicht erzwingen.`,
    };
  }

  // 3) Doppelprogression: oberes Spannenende mit Reserve erreicht.
  //    Beim FRISCHEN 1. Satz lohnt der Sprung sofort, sonst erst nächste
  //    Einheit (innerhalb der Einheit Ermüdung respektieren).
  if (beatHigh >= 0 && clearReserve && done.weight > 0) {
    const heavier = roundToIncrement(
      done.weight + progressionJump(profile, done.weight),
      inc,
    );
    if (isFirst) {
      return {
        nextWeight: heavier,
        nextReps: low, // bei höherer Last unten in der Spanne neu ansetzen
        newE1RM,
        pr,
        tone: insight.status === "stalled" ? "limit" : "push",
        message:
          `${done.reps} Wdh am oberen Ende${rpeTxt} mit Reserve — Zeit, die Last zu erhöhen. ` +
          `Nächster Satz ${heavier} kg, ziel auf ${low}+ Wdh.` +
          historyNote,
      };
    }
    return {
      nextWeight: hold,
      nextReps: Math.max(low, high - fatigueReps(setNo)),
      newE1RM,
      pr,
      tone: "push",
      message:
        `Oberes Spannenende geknackt (${done.reps} Wdh${rpeTxt}). Heute ${hold} kg halten, ` +
        `nächste Einheit auf ${heavier} kg steigern.` +
        (remaining > 0 ? ` Noch ${remaining} ${remaining === 1 ? "Satz" : "Sätze"}.` : ""),
    };
  }

  // 4) In der Spanne mit Reserve, aber kein Sprung fällig → Gewicht HALTEN und
  //    Wdh ausbauen (Doppelprogression: erst die Spanne füllen, dann Last).
  if (done.reps >= low && !toughRpe && done.weight > 0) {
    const toGo = Math.max(0, high - done.reps);
    return {
      nextWeight: hold,
      nextReps: Math.max(low, high - fatigueReps(setNo)),
      newE1RM,
      pr,
      tone: "hold",
      message:
        remaining > 0
          ? pick(
              [
                `Sauber, ${done.reps} Wdh${rpeTxt}. ${hold} kg halten` +
                  (toGo > 0 ? `, bau Richtung ${high} Wdh aus.` : `.`) +
                  ` Noch ${remaining} ${remaining === 1 ? "Satz" : "Sätze"}.`,
                `Sitzt (${intensity}% vom Max). ${hold} kg beibehalten, Form sauber. Noch ${remaining} zu gehen.`,
                `Gut kontrolliert. ${hold} kg, Ermüdung ist eingeplant${toGo > 0 ? ` – Ziel bleibt ${high} Wdh` : ""}.`,
              ],
              setNo,
            ) + historyNote
          : `Letzter Satz sauber in der Spanne — gut gemacht.` + historyNote,
    };
  }

  // 5) In der Spanne, aber schon fordernd (RPE am Push-Level) → halten.
  if (done.reps >= low && done.weight > 0) {
    return {
      nextWeight: hold,
      nextReps: tgt,
      newE1RM,
      pr,
      tone: "hold",
      message:
        remaining > 0
          ? `In der Spanne und fordernd${rpeTxt}. ${hold} kg halten — genau die richtige Dosis.`
          : `Im Ziel abgeschlossen, ordentlich gefordert.`,
    };
  }

  // 6) Knapp unter der Spanne (1 Wdh) → späte Sätze normal, frühe dranbleiben.
  if (done.reps === low - 1 && done.weight > 0) {
    return {
      nextWeight: hold,
      nextReps: low,
      newE1RM,
      pr,
      tone: "hold",
      message:
        setNo >= 3
          ? `Eine Wdh unter der Spanne — nach ${setNo} Sätzen normal. ${hold} kg halten.`
          : `Knapp dran, eine Wdh fehlt zur Spanne. ${hold} kg halten und die ${low} holen.`,
    };
  }

  // 7) Klar unter der Spanne / sehr zäh → Last reduzieren.
  const lighter = roundToIncrement(done.weight * (1 - style.stepPct), inc);
  return {
    nextWeight: lighter > 0 ? lighter : hold,
    nextReps: tgt,
    newE1RM,
    pr,
    tone: "back",
    message:
      (setNo >= 3
        ? `Kraft lässt nach — so spät normal. `
        : `Heute zäh bei dem Gewicht${rpeTxt}. `) +
      `Nächster Satz ${lighter > 0 ? lighter : hold} kg, sauber für ${low}–${high} Wdh.`,
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

  const pct = Math.round(ratio * 100);

  // Nahe am oder über dem geschätzten Maximum.
  if (ratio >= 0.97) {
    return {
      tone: "caution",
      message:
        `${enteredWeight} kg ≈ dein geschätztes Maximum (${Math.round(oneRm)} kg, ${pct}%). ` +
        `Nur technisch sauber und mit Sicherung — genau hier verschiebst du die Grenze.`,
    };
  }
  // Folgesatz: gehaltenes/leicht reduziertes Gewicht ist gewollt → nicht nörgeln.
  if (isFollowUp) {
    if (enteredWeight > rec.weight * 1.08) {
      return {
        tone: "caution",
        message:
          `${enteredWeight} kg ist für einen Folgesatz ambitioniert — die Ermüdung läuft mit. ` +
          `Hält die Form, gern; sonst ${rec.weight} kg.`,
      };
    }
    return null;
  }
  // 1. Satz, deutlich schwerer als empfohlen → anfeuern.
  if (enteredWeight > rec.weight * 1.02) {
    return {
      tone: "bold",
      message:
        `Mutig! Bei ${enteredWeight} kg (${pct}%) trau ich dir ~${predReps} Wdh zu. ` +
        `Bleib bei sauberer Technik — ich zähl mit.`,
    };
  }
  // 1. Satz, deutlich leichter als empfohlen → mehr fordern (Doppelprogression).
  if (enteredWeight < rec.weight * 0.92) {
    return {
      tone: "info",
      message:
        `Da geht mehr. Für echten Reiz: ${rec.weight} kg × ${rec.repLow}–${rec.repHigh} ` +
        `(${rec.rir} Wdh Reserve).`,
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

// Aufwärm-Rampe zum Arbeitsgewicht. Je schwerer das Arbeitsgewicht und je
// älter/kraftorientierter, desto mehr Stufen. Wiederholungen nehmen mit
// steigender Last ab (mehr Wdh leicht → wenige schwer), die letzte Aufwärmstufe
// ist bewusst nah am Arbeitsgewicht, aber mit Reserve. Kleine Lasten brauchen
// keine eigene Rampe.
export function warmupPlan(
  workWeight: number,
  profile: CoachProfile,
): WarmupSet[] {
  if (workWeight < 20) return []; // zu leicht für separates Aufwärmen
  const a = age(profile);
  const heavy = profile.goal === "strength" || workWeight >= 100;
  const older = a !== null && a >= 45;
  // Prozentschritte vom Arbeitsgewicht.
  let steps: number[];
  if (heavy && older) steps = [0.35, 0.5, 0.65, 0.8, 0.9];
  else if (heavy || older) steps = [0.4, 0.6, 0.75, 0.88];
  else steps = [0.5, 0.75];
  return steps.map((pct) => ({
    pct: Math.round(pct * 100),
    weight: roundToIncrement(workWeight * pct, loadIncrement(workWeight * pct)),
    reps: pct <= 0.4 ? 10 : pct < 0.6 ? 6 : pct < 0.8 ? 4 : 2,
  }));
}

/* ---------------- Pausen-Empfehlung ---------------- */

// Empfohlene Satzpause in Sekunden, abhängig von Ziel, Stil – und, wenn
// bekannt, von der tatsächlichen Anstrengung (RPE) und der Übungsart:
// schwere/harte Grundübungen brauchen länger, leichte Isolation weniger.
export function recommendedRest(
  profile: CoachProfile,
  ctx?: { rpe?: number | null; compound?: boolean },
): number {
  const base =
    profile.goal === "strength"
      ? 180
      : profile.goal === "hypertrophy"
        ? 105
        : 60; // endurance
  // Aggressiver Stil drückt etwas kürzer (Dichte), vorsichtig etwas länger.
  let adj =
    profile.coachStyle === "aggressive"
      ? -15
      : profile.coachStyle === "cautious"
        ? 20
        : 0;
  // Anstrengung: harte Sätze (nahe Versagen) brauchen mehr Erholung.
  if (ctx?.rpe != null) {
    if (ctx.rpe >= 9.5) adj += 45;
    else if (ctx.rpe >= 8.5) adj += 25;
    else if (ctx.rpe <= 6) adj -= 20;
  }
  // Übungsart: mehrgelenkig zehrt mehr als Isolation.
  if (ctx?.compound === true) adj += 20;
  else if (ctx?.compound === false) adj -= 15;

  return Math.max(45, Math.min(300, base + adj));
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

  // Methodik: progressive Überlastung & RPE-Logging machen die Steuerung erst
  // möglich – das gilt unabhängig vom Profil.
  tips.push(
    "Doppelprogression: erst die Wiederholungen bis ans obere Spannenende ausbauen, dann die Last in kleinen Schritten erhöhen.",
  );
  tips.push(
    "Trag den RPE ein (gefühlte Anstrengung) – damit schätze ich dein Maximum und die nächste Last viel genauer.",
  );

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

/* ---------------- Technik-/Tempo-Hinweis ---------------- */

// Kurzer Ausführungs-Hinweis passend zum Ziel – Technik vor Ego.
export function tempoCue(profile: CoachProfile): string {
  switch (profile.goal) {
    case "strength":
      return "Kontrolliert ablassen (2–3 s), explosiv aber sauber drücken, Spannung halten. Technik vor Last.";
    case "endurance":
      return "Zügiges, gleichmäßiges Tempo, voller Bewegungsumfang, ruhig weiteratmen. Form geht vor Tempo.";
    default:
      return "1–2 s kontrolliert ablassen, voller Bewegungsumfang, kein Schwung – spür den Zielmuskel.";
  }
}

/* ---------------- Übungs-Empfehlung am Ende der Einheit ---------------- */

// Evidenz-orientierte Richtwerte für harte Arbeitssätze JE Muskelgruppe PRO
// Einheit: ~5–10 sind ein voller Reiz, <5 ist eine leichte Berührung, sehr
// hohe Gesamtvolumina bringen v. a. Ermüdung. Bewusst als Richtwerte, nicht als
// absolute Wahrheit – die Aussagen unten bleiben deshalb streng an den realen
// Zahlen.
const SESSION_GROUP_MIN = 5; // ab hier gilt eine Gruppe als solide versorgt
const SESSION_TOTAL_CEILING = 25; // darüber dominiert Ermüdung

export type SessionAdvice = {
  verdict: "add" | "stop";
  headline: string;
  detail: string;
  suggestions: string[]; // konkrete, heute noch nicht genutzte Übungsnamen
};

// Sagt am Ende der Einheit ehrlich: noch eine Übung dranhängen (welche?) oder
// aufhören. Streng datengetrieben – jede Aussage deckt sich mit den Zahlen.
export function sessionExerciseAdvice(input: {
  perGroupSets: Record<string, number>; // harte Arbeitssätze je Gruppe, diese Einheit
  availableByGroup: Record<string, string[]>; // verfügbare, heute ungenutzte Übungen
  profile: CoachProfile;
}): SessionAdvice {
  const { perGroupSets, availableByGroup } = input;
  const trained = Object.entries(perGroupSets).filter(([, n]) => n > 0);
  const totalSets = trained.reduce((a, [, n]) => a + n, 0);

  if (totalSets === 0) {
    return {
      verdict: "stop",
      headline: "Noch kein abgeschlossener Satz",
      detail: "Hak deine Sätze ab, dann sage ich dir, ob noch etwas fehlt.",
      suggestions: [],
    };
  }

  // Leicht belastete, aber bereits trainierte Gruppen, für die es noch eine
  // verfügbare Übung gibt → echte Kandidaten zum Dranhängen.
  const candidates = trained
    .filter(([g, n]) => n < SESSION_GROUP_MIN && (availableByGroup[g]?.length ?? 0) > 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2);

  const overCeiling = totalSets >= SESSION_TOTAL_CEILING;

  if (candidates.length > 0 && !overCeiling) {
    const suggestions = candidates.map(([g]) => availableByGroup[g][0]);
    const parts = candidates.map(
      ([g, n]) =>
        `${g} (erst ${n} ${n === 1 ? "harter Satz" : "harte Sätze"}) → z. B. „${availableByGroup[g][0]}"`,
    );
    return {
      verdict: "add",
      headline: "Da geht noch was",
      detail:
        `Für einen vollen Reiz sind ~${SESSION_GROUP_MIN}–10 harte Sätze pro Gruppe sinnvoll. ` +
        `Häng noch dran: ${parts.join("; ")}.`,
      suggestions,
    };
  }

  // Sonst: aufhören – aber mit der ZUTREFFENDEN Begründung.
  let detail: string;
  if (overCeiling) {
    detail = `Hohes Volumen heute (${totalSets} harte Sätze). Mehr bringt jetzt vor allem Ermüdung statt Reiz — sauber beenden und erholen.`;
  } else if (trained.every(([, n]) => n >= SESSION_GROUP_MIN)) {
    detail = `Alle heute trainierten Muskelgruppen haben genug harte Sätze (≥${SESSION_GROUP_MIN}) abbekommen. Ein weiterer Reiz würde v. a. ermüden — aufhören ist die richtige Wahl.`;
  } else {
    detail =
      "Für die noch leichter belasteten Gruppen hast du aktuell keine passende weitere Übung im Katalog. Damit ist hier Schluss sinnvoll — oder leg dir später eine passende Übung an.";
  }
  return { verdict: "stop", headline: "Genug für heute", detail, suggestions: [] };
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

  // 3b) Mehrere Lifts klemmen gleichzeitig → systemische Ermüdung, Deload.
  if (notes.length < 3 && stalling.length >= 2) {
    notes.push(
      `${stalling.length} Übungen stagnieren parallel – das riecht nach Ermüdung. Gönn dir eine Deload-Woche (Last ~10 % runter) und komm stärker zurück.`,
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

/* ---------------- Bestenlisten-Score ---------------- */

// Gewichtungen des Gesamt-Scores – bewusst einfach & transparent, damit jeder
// Punkt nachvollziehbar ist (die Aufschlüsselung im UI zitiert genau diese
// Regeln).
export const SCORE_RULES = {
  pointsPerWorkout: 10, // Konsistenz: je abgeschlossenem Workout
  kgPerVolumePoint: 1000, // Volumen: 1 Punkt je 1.000 kg Gesamtvolumen
  kgPer1RMPoint: 2, // Coach·Stärke: 1 Punkt je 2 kg bestem 1RM
  progress: {
    rising: 15, // Übung im Aufwärtstrend
    fresh: 5, // neue Übung (erst eine Einheit)
    flat: 5, // stabil gehalten
    stalled: 2, // Plateau
    regressing: 0, // Rückgang
  },
} as const;

export type TrendCounts = {
  rising: number;
  fresh: number;
  flat: number;
  stalled: number;
  regressing: number;
};

export type ScoreInput = {
  workouts: number; // abgeschlossene Workouts
  volume: number; // Gesamtvolumen in kg
  best1rm: number; // stärkstes geschätztes 1RM in kg
  trend: TrendCounts; // Übungs-Trends laut Coach-Verlaufsanalyse
  achievementPoints?: number; // verdiente Achievement-Belohnungspunkte
};

// Eine Zeile der Punkte-Aufschlüsselung (serialisierbar fürs UI).
export type ScoreLine = {
  key: "consistency" | "volume" | "strength" | "progress" | "achievements";
  label: string;
  detail: string; // wie sich die Punkte errechnen
  points: number;
};

export type ScoreResult = {
  total: number;
  lines: ScoreLine[];
};

function progressDetail(t: TrendCounts): string {
  const parts: string[] = [];
  if (t.rising) parts.push(`${t.rising}× Aufwärts`);
  if (t.flat) parts.push(`${t.flat}× stabil`);
  if (t.fresh) parts.push(`${t.fresh}× neu`);
  if (t.stalled) parts.push(`${t.stalled}× Plateau`);
  if (t.regressing) parts.push(`${t.regressing}× Rückgang`);
  return parts.length ? parts.join(", ") : "Noch keine Verlaufsdaten";
}

// Verrechnet die Kennzahlen eines Accounts zu einem Gesamt-Score und liefert
// die exakte Aufschlüsselung je Bestandteil (Konsistenz, Volumen, Coach·Stärke,
// Coach·Fortschritt). Deterministisch und rein.
export function computeScore(input: ScoreInput): ScoreResult {
  const r = SCORE_RULES;
  const consistency = input.workouts * r.pointsPerWorkout;
  const volume = Math.round(input.volume / r.kgPerVolumePoint);
  const strength = Math.round(input.best1rm / r.kgPer1RMPoint);
  const t = input.trend;
  const progress =
    t.rising * r.progress.rising +
    t.fresh * r.progress.fresh +
    t.flat * r.progress.flat +
    t.stalled * r.progress.stalled +
    t.regressing * r.progress.regressing;

  const lines: ScoreLine[] = [
    {
      key: "consistency",
      label: "Konsistenz",
      detail: `${input.workouts} Workouts × ${r.pointsPerWorkout}`,
      points: consistency,
    },
    {
      key: "volume",
      label: "Volumen",
      detail: `${Math.round(input.volume).toLocaleString("de-DE")} kg ÷ ${r.kgPerVolumePoint.toLocaleString("de-DE")}`,
      points: volume,
    },
    {
      key: "strength",
      label: "Coach · Stärke",
      detail:
        input.best1rm > 0
          ? `Bestes 1RM ${Math.round(input.best1rm)} kg ÷ ${r.kgPer1RMPoint}`
          : "Noch kein 1RM erfasst",
      points: strength,
    },
    {
      key: "progress",
      label: "Coach · Fortschritt",
      detail: progressDetail(t),
      points: progress,
    },
  ];

  const ach = Math.max(0, Math.round(input.achievementPoints ?? 0));
  if (ach > 0) {
    lines.push({
      key: "achievements",
      label: "Achievements",
      detail: `${ach} Belohnungspunkte freigeschaltet`,
      points: ach,
    });
  }

  return {
    total: consistency + volume + strength + progress + ach,
    lines,
  };
}
