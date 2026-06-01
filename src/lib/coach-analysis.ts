// Schonungslos ehrliche Trainings-Analyse — deterministische Sportwissenschaft
// (pure TS, kein LLM). Wertet die gesamte Workout-Historie eines Nutzers aus und
// liefert harte Fakten: Konsistenz, Volumen-Trend, Muskelbalance, Kraft-
// entwicklung je Übung, Intensität/Anstrengung, Zielausrichtung, Erholung und
// Kraftstandards relativ zum Körpergewicht. Bewusst offline & reproduzierbar.

import { differenceInCalendarDays, startOfWeek, format } from "date-fns";
import {
  e1rm,
  age,
  GOAL_CONFIG,
  GOAL_LABELS,
  EXPERIENCE_LABELS,
  type CoachProfile,
} from "./coach";

/* ---------------- Eingabe-Typen (vom Server befüllt) ---------------- */

export type AnalysisSet = {
  weight: number;
  reps: number;
  rpe: number | null;
  isCompleted: boolean;
  setType: string; // warmup, normal, dropset, failure
};

export type AnalysisExercise = {
  exerciseId: string;
  name: string;
  muscle: string; // primaryMuscle nameDe
  bodyRegion: string; // Oberkörper / Unterkörper / Rumpf …
  mechanic: string; // compound | isolation
  forceType: string; // push | pull | static
  sets: AnalysisSet[];
};

export type AnalysisWorkout = {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  exercises: AnalysisExercise[];
};

// Für die Erkennung vernachlässigter Muskeln: alle Muskeln des Katalogs.
export type CatalogMuscle = { nameDe: string; bodyRegion: string };

/* ---------------- Ausgabe-Typen ---------------- */

export type Severity = "good" | "info" | "warning" | "critical";

export type Finding = {
  severity: Severity;
  title: string;
  detail: string;
};

export type Metric = { label: string; value: string; sub?: string };

export type AnalysisSection = {
  key: string;
  title: string;
  score: number | null; // 0-100, null = nicht bewertbar
  summary: string;
  metrics: Metric[];
  findings: Finding[];
};

export type LiftProgress = {
  name: string;
  sessions: number;
  firstE1RM: number;
  lastE1RM: number;
  bestE1RM: number;
  changePct: number;
  trend: "up" | "flat" | "down";
  daysSinceBest: number;
};

export type StrengthStandard = {
  name: string;
  e1rm: number;
  ratio: number; // e1RM / Körpergewicht
  level: string; // Einsteiger / Geübt / Stark / Sehr stark / Elite
  nextLevel: string | null;
  nextRatio: number | null;
};

export type Analysis = {
  hasData: boolean;
  score: number; // 0-100 gesamt
  grade: string; // Schulnote-artiges Label
  headline: string;
  verdict: string; // harter, ehrlicher Absatz
  sections: AnalysisSection[];
  lifts: LiftProgress[];
  standards: StrengthStandard[];
  priorities: string[];
  generatedAt: Date;
};

/* ---------------- Helfer ---------------- */

const DAY = 86_400_000;

function isWorking(s: AnalysisSet): boolean {
  return (
    s.isCompleted && s.setType !== "warmup" && s.weight > 0 && s.reps > 0
  );
}

function setVolume(s: AnalysisSet): number {
  return s.weight * s.reps;
}

function round(n: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function weekKey(d: Date): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function gradeFor(score: number): string {
  if (score >= 90) return "Hervorragend";
  if (score >= 78) return "Stark";
  if (score >= 65) return "Solide";
  if (score >= 50) return "Ausbaufähig";
  if (score >= 35) return "Schwach";
  return "Kritisch";
}

/* ---------------- Kraftstandards (Orientierung, rel. Körpergewicht) ---------------- */
// Vielfaches des Körpergewichts. Werte sind übliche Richtwerte für Männer;
// für Frauen ~0,72×. Es sind Orientierungen, keine absoluten Wahrheiten.

const STANDARD_KEYS: Array<{
  match: RegExp;
  label: string;
  // [Einsteiger, Geübt, Stark, Sehr stark, Elite]
  ratios: [number, number, number, number, number];
}> = [
  {
    match: /(bankdr|bench)/i,
    label: "Bankdrücken",
    ratios: [0.5, 0.75, 1.1, 1.5, 2.0],
  },
  {
    match: /(kniebeug|squat)/i,
    label: "Kniebeuge",
    ratios: [0.75, 1.1, 1.5, 2.0, 2.5],
  },
  {
    match: /(kreuzheb|deadlift)/i,
    label: "Kreuzheben",
    ratios: [1.0, 1.4, 1.85, 2.35, 3.0],
  },
  {
    match: /(schulterdr|overhead|military|ohp)/i,
    label: "Schulterdrücken",
    ratios: [0.35, 0.5, 0.7, 0.9, 1.15],
  },
];

const LEVELS = ["Einsteiger", "Geübt", "Stark", "Sehr stark", "Elite"];

function classifyStandard(
  ratio: number,
  ratios: [number, number, number, number, number],
  sexMul: number,
): { level: string; nextLevel: string | null; nextRatio: number | null } {
  const adj = ratios.map((r) => r * sexMul);
  let idx = -1;
  for (let i = 0; i < adj.length; i++) {
    if (ratio >= adj[i]) idx = i;
  }
  if (idx < 0) {
    return {
      level: "Unter Einsteiger",
      nextLevel: LEVELS[0],
      nextRatio: adj[0],
    };
  }
  const level = LEVELS[idx];
  const nextLevel = idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;
  const nextRatio = idx + 1 < adj.length ? adj[idx + 1] : null;
  return { level, nextLevel, nextRatio };
}

/* ---------------- Hauptfunktion ---------------- */

export function analyze(
  profile: CoachProfile,
  workouts: AnalysisWorkout[],
  catalog: CatalogMuscle[],
  now: Date = new Date(),
): Analysis {
  // Nur abgeschlossene Workouts, chronologisch.
  const done = workouts
    .filter((w) => w.finishedAt !== null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  if (done.length === 0) {
    return {
      hasData: false,
      score: 0,
      grade: "Keine Daten",
      headline: "Noch nichts zu analysieren",
      verdict:
        "Du hast noch kein Workout abgeschlossen. Es gibt nichts schönzureden " +
        "und nichts zu kritisieren — fang an zu trainieren, dann zerlege ich " +
        "deine Daten Stück für Stück.",
      sections: [],
      lifts: [],
      standards: [],
      priorities: ["Schließe dein erstes Workout ab, damit der Coach dich lesen kann."],
      generatedAt: now,
    };
  }

  const sections: AnalysisSection[] = [];
  const priorities: { sev: Severity; text: string }[] = [];
  const addPriority = (sev: Severity, text: string) => {
    if (sev === "critical" || sev === "warning") priorities.push({ sev, text });
  };

  /* ===== 1. Konsistenz & Frequenz ===== */
  const first = done[0].startedAt;
  const last = done[done.length - 1].startedAt;
  const spanDays = Math.max(1, differenceInCalendarDays(last, first) + 1);
  const spanWeeks = Math.max(1, spanDays / 7);
  const perWeek = done.length / spanWeeks;
  const daysSinceLast = Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY));

  // Längste Pause zwischen zwei Einheiten.
  let longestGap = 0;
  for (let i = 1; i < done.length; i++) {
    const gap = differenceInCalendarDays(done[i].startedAt, done[i - 1].startedAt);
    if (gap > longestGap) longestGap = gap;
  }
  const last7 = done.filter((w) => now.getTime() - w.startedAt.getTime() <= 7 * DAY).length;
  const last30 = done.filter((w) => now.getTime() - w.startedAt.getTime() <= 30 * DAY).length;
  const target = profile.trainingDaysPerWeek ?? null;

  const consFindings: Finding[] = [];
  let consScore = clamp(perWeek >= 3 ? 90 : (perWeek / 3) * 90, 10, 95);

  if (daysSinceLast > 21) {
    consFindings.push({
      severity: "critical",
      title: `${daysSinceLast} Tage keine Einheit`,
      detail:
        "Das ist kein Trainingszustand mehr, das ist eine Pause. Kraft und " +
        "Muskeln bilden sich messbar zurück. Jeder weitere Tag macht den " +
        "Wiedereinstieg härter.",
    });
    consScore -= 45;
    addPriority("critical", `Sofort wieder anfangen — ${daysSinceLast} Tage Stillstand.`);
  } else if (daysSinceLast > 10) {
    consFindings.push({
      severity: "warning",
      title: `${daysSinceLast} Tage seit der letzten Einheit`,
      detail:
        "Über eine Woche Pause. Einmalig okay, aber wenn das dein Muster ist, " +
        "trittst du auf der Stelle.",
    });
    consScore -= 20;
    addPriority("warning", "Bring dein Training zurück in einen festen Rhythmus.");
  } else if (daysSinceLast <= 3) {
    consFindings.push({
      severity: "good",
      title: "Aktuell dran",
      detail: `Letzte Einheit vor ${daysSinceLast} Tag(en) — du bist im Rhythmus.`,
    });
  }

  if (target) {
    if (perWeek < target * 0.7) {
      consFindings.push({
        severity: "warning",
        title: "Du hältst dein eigenes Ziel nicht",
        detail: `Du willst ${target}×/Woche, machst real aber nur ${round(perWeek, 1)}×. ` +
          "Entweder die Zahl ist unrealistisch — dann korrigier sie — oder du " +
          "lässt zu oft aus.",
      });
      consScore -= 12;
      addPriority("warning", `Frequenz an dein Ziel (${target}×/Woche) anpassen.`);
    } else if (perWeek >= target) {
      consFindings.push({
        severity: "good",
        title: "Frequenz-Ziel erfüllt",
        detail: `${round(perWeek, 1)} Einheiten/Woche im Schnitt — dein Ziel von ${target}× sitzt.`,
      });
    }
  }

  if (longestGap >= 14 && done.length > 3) {
    consFindings.push({
      severity: "info",
      title: `Längste Pause: ${longestGap} Tage`,
      detail: "So lange warst du schon mal weg. Solche Löcher kosten dich am meisten Fortschritt.",
    });
  }

  sections.push({
    key: "consistency",
    title: "Konsistenz & Frequenz",
    score: clamp(consScore),
    summary: `${done.length} Einheiten über ${round(spanWeeks, 1)} Wochen · ${round(perWeek, 1)}/Woche im Schnitt.`,
    metrics: [
      { label: "Workouts gesamt", value: String(done.length) },
      { label: "Ø pro Woche", value: round(perWeek, 1).toString() },
      { label: "Letzte 7 Tage", value: String(last7) },
      { label: "Letzte 30 Tage", value: String(last30) },
      { label: "Seit letzter Einheit", value: `${daysSinceLast} T` },
      { label: "Längste Pause", value: `${longestGap} T` },
    ],
    findings: consFindings,
  });

  /* ===== 2. Volumen-Trend ===== */
  const weekVol = new Map<string, number>();
  for (const w of done) {
    const key = weekKey(w.startedAt);
    let v = 0;
    for (const ex of w.exercises) for (const s of ex.sets) if (isWorking(s)) v += setVolume(s);
    weekVol.set(key, (weekVol.get(key) ?? 0) + v);
  }
  const weeks = [...weekVol.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalVolume = weeks.reduce((s, [, v]) => s + v, 0);

  const volFindings: Finding[] = [];
  let volScore: number | null = null;
  if (weeks.length >= 4) {
    const recent = weeks.slice(-4).reduce((s, [, v]) => s + v, 0);
    const prev = weeks.slice(-8, -4).reduce((s, [, v]) => s + v, 0);
    if (prev > 0) {
      const trendPct = ((recent - prev) / prev) * 100;
      volScore = clamp(60 + trendPct, 20, 95);
      if (trendPct > 8) {
        volFindings.push({
          severity: "good",
          title: `Volumen steigt (+${round(trendPct)}%)`,
          detail: "Die letzten 4 Wochen liegen klar über den 4 davor. Genau so wächst Leistung — solange die Erholung mitkommt.",
        });
      } else if (trendPct < -8) {
        volFindings.push({
          severity: "warning",
          title: `Volumen fällt (${round(trendPct)}%)`,
          detail: "Du machst weniger als vor einem Monat. Entweder bewusster Deload — oder du verlierst gerade Boden.",
        });
        addPriority("warning", "Trainingsvolumen wieder hochfahren oder bewusst als Deload planen.");
      } else {
        volFindings.push({
          severity: "info",
          title: "Volumen stagniert",
          detail: `Kaum Veränderung (${round(trendPct)}%) gegenüber dem Vormonat. Ohne progressive Steigerung kein neuer Reiz.`,
        });
        addPriority("warning", "Progressive Überlastung: pro Woche etwas mehr Gewicht, Wdh oder Sätze.");
      }
    }
  } else {
    volFindings.push({
      severity: "info",
      title: "Noch zu wenig Wochen für einen Trend",
      detail: "Ich brauche mindestens ~4–8 Trainingswochen, um eine belastbare Volumen-Kurve zu zeichnen.",
    });
  }

  sections.push({
    key: "volume",
    title: "Volumen-Trend",
    score: volScore,
    summary: `${Math.round(totalVolume).toLocaleString("de-DE")} kg bewegt über ${weeks.length} Trainingswochen.`,
    metrics: [
      { label: "Gesamtvolumen", value: `${Math.round(totalVolume).toLocaleString("de-DE")} kg` },
      { label: "Trainingswochen", value: String(weeks.length) },
      {
        label: "Ø Volumen/Woche",
        value: `${Math.round(totalVolume / Math.max(1, weeks.length)).toLocaleString("de-DE")} kg`,
      },
    ],
    findings: volFindings,
  });

  /* ===== 3. Muskelbalance ===== */
  const muscleVol = new Map<string, number>();
  const muscleSets = new Map<string, number>();
  const regionVol = new Map<string, number>();
  let pushVol = 0;
  let pullVol = 0;
  for (const w of done) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!isWorking(s)) continue;
        const v = setVolume(s);
        muscleVol.set(ex.muscle, (muscleVol.get(ex.muscle) ?? 0) + v);
        muscleSets.set(ex.muscle, (muscleSets.get(ex.muscle) ?? 0) + 1);
        regionVol.set(ex.bodyRegion, (regionVol.get(ex.bodyRegion) ?? 0) + v);
        if (ex.forceType === "push") pushVol += v;
        else if (ex.forceType === "pull") pullVol += v;
      }
    }
  }

  const balFindings: Finding[] = [];
  let balScore = 80;

  // Push vs Pull
  if (pushVol > 0 && pullVol > 0) {
    const ratio = pushVol / pullVol;
    if (ratio > 1.6) {
      balFindings.push({
        severity: "warning",
        title: "Druck-Überschuss",
        detail: `Du drückst deutlich mehr als du ziehst (${round(ratio, 1)}:1). Das zieht die Schultern nach vorn und bremst den Rücken. Mehr Rudern/Klimmzüge.`,
      });
      balScore -= 18;
      addPriority("warning", "Zugübungen (Rücken) hochziehen — dein Push:Pull-Verhältnis kippt.");
    } else if (ratio < 0.62) {
      balFindings.push({
        severity: "warning",
        title: "Zug-Überschuss",
        detail: `Du ziehst deutlich mehr als du drückst (${round(ratio, 1)}:1). Brust/Schulter hinken hinterher.`,
      });
      balScore -= 12;
    } else {
      balFindings.push({
        severity: "good",
        title: "Push/Pull ausgewogen",
        detail: `Druck und Zug halten sich die Waage (${round(ratio, 1)}:1). Sauber.`,
      });
    }
  }

  // Ober- vs Unterkörper
  const upper = regionVol.get("Oberkörper") ?? 0;
  const lower = regionVol.get("Unterkörper") ?? 0;
  if (upper > 0) {
    if (lower === 0) {
      balFindings.push({
        severity: "critical",
        title: "Kein Beintraining",
        detail: "Im gesamten Zeitraum null Volumen für die Beine. Das ist die klassische Lücke — Beine sind die größte Muskelmasse und der größte Hebel für Kraft und Hormonantwort.",
      });
      balScore -= 30;
      addPriority("critical", "Beintag einbauen: Kniebeuge, Beinpresse, Kreuzheben.");
    } else if (lower < upper * 0.4) {
      balFindings.push({
        severity: "warning",
        title: "Beine vernachlässigt",
        detail: `Unterkörper macht nur ${round((lower / (upper + lower)) * 100)}% deines Volumens. Skip-Leg-Day lässt grüßen.`,
      });
      balScore -= 18;
      addPriority("warning", "Beinvolumen erhöhen — Ober/Unter ist unausgeglichen.");
    }
  }

  // Vernachlässigte Muskeln (im Katalog, aber kaum/nie trainiert)
  const trainedMuscles = new Set([...muscleVol.keys()]);
  const allMuscles = [...new Set(catalog.map((m) => m.nameDe))];
  const neglected = allMuscles.filter((m) => !trainedMuscles.has(m));
  if (neglected.length > 0 && allMuscles.length > 0) {
    const shown = neglected.slice(0, 8);
    balFindings.push({
      severity: neglected.length > allMuscles.length / 2 ? "warning" : "info",
      title: `${neglected.length} Muskelgruppe(n) nie trainiert`,
      detail: `Komplett ausgelassen: ${shown.join(", ")}${neglected.length > shown.length ? " …" : ""}. ` +
        "Lücken werden mit der Zeit zu Schwachstellen und Verletzungsrisiken.",
    });
    if (neglected.length > allMuscles.length / 2) balScore -= 10;
  }

  // Top/Flop nach Volumen
  const muscleRanked = [...muscleVol.entries()].sort((a, b) => b[1] - a[1]);
  const balMetrics: Metric[] = muscleRanked.slice(0, 5).map(([m, v]) => ({
    label: m,
    value: `${Math.round(v).toLocaleString("de-DE")} kg`,
    sub: `${muscleSets.get(m) ?? 0} Sätze`,
  }));

  sections.push({
    key: "balance",
    title: "Muskelbalance",
    score: clamp(balScore),
    summary:
      pushVol + pullVol > 0
        ? `Push ${Math.round(pushVol).toLocaleString("de-DE")} kg vs. Pull ${Math.round(pullVol).toLocaleString("de-DE")} kg.`
        : "Verteilung deines Volumens auf Muskelgruppen.",
    metrics: balMetrics,
    findings: balFindings,
  });

  /* ===== 4. Kraftentwicklung je Übung ===== */
  type LiftAgg = {
    name: string;
    sessions: { date: Date; e1rm: number }[];
  };
  const liftMap = new Map<string, LiftAgg>();
  for (const w of done) {
    for (const ex of w.exercises) {
      let best = 0;
      for (const s of ex.sets) if (isWorking(s)) best = Math.max(best, e1rm(s.weight, s.reps));
      if (best <= 0) continue;
      const agg = liftMap.get(ex.exerciseId) ?? { name: ex.name, sessions: [] };
      agg.sessions.push({ date: w.startedAt, e1rm: best });
      liftMap.set(ex.exerciseId, agg);
    }
  }

  const lifts: LiftProgress[] = [];
  for (const agg of liftMap.values()) {
    if (agg.sessions.length < 3) continue;
    agg.sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstE = agg.sessions[0].e1rm;
    const lastE = agg.sessions[agg.sessions.length - 1].e1rm;
    let bestE = 0;
    let bestDate = agg.sessions[0].date;
    for (const s of agg.sessions) {
      if (s.e1rm > bestE) {
        bestE = s.e1rm;
        bestDate = s.date;
      }
    }
    const changePct = firstE > 0 ? ((lastE - firstE) / firstE) * 100 : 0;
    const daysSinceBest = Math.max(0, Math.floor((now.getTime() - bestDate.getTime()) / DAY));
    const trend: LiftProgress["trend"] =
      changePct > 4 ? "up" : changePct < -4 ? "down" : "flat";
    lifts.push({
      name: agg.name,
      sessions: agg.sessions.length,
      firstE1RM: round(firstE, 1),
      lastE1RM: round(lastE, 1),
      bestE1RM: round(bestE, 1),
      changePct: round(changePct, 1),
      trend,
      daysSinceBest,
    });
  }
  lifts.sort((a, b) => b.sessions - a.sessions);
  const topLifts = lifts.slice(0, 8);

  const progFindings: Finding[] = [];
  let progScore: number | null = null;
  if (topLifts.length > 0) {
    const up = topLifts.filter((l) => l.trend === "up").length;
    const down = topLifts.filter((l) => l.trend === "down").length;
    const stalled = topLifts.filter((l) => l.trend === "flat" && l.daysSinceBest > 28);
    progScore = clamp(50 + (up / topLifts.length) * 50 - (down / topLifts.length) * 40);

    for (const l of topLifts.filter((x) => x.trend === "down").slice(0, 3)) {
      progFindings.push({
        severity: "critical",
        title: `${l.name}: ${l.changePct}%`,
        detail: `Geschätztes Maximum von ${l.firstE1RM} auf ${l.lastE1RM} kg gefallen. Das ist ein echter Rückschritt, kein Messrauschen.`,
      });
      addPriority("critical", `${l.name} stabilisieren — die Kraft geht zurück.`);
    }
    for (const l of stalled.slice(0, 3)) {
      progFindings.push({
        severity: "warning",
        title: `${l.name} steht seit ${l.daysSinceBest} Tagen`,
        detail: `Seit ${l.daysSinceBest} Tagen kein neues geschätztes Maximum (${l.bestE1RM} kg). Plateau. Zeit für Variation: Wdh-Bereich, Pausen oder ein gezielter Limit-Test.`,
      });
      addPriority("warning", `${l.name}: Plateau durchbrechen (Variation / Limit-Test).`);
    }
    const best = topLifts.filter((l) => l.trend === "up").sort((a, b) => b.changePct - a.changePct)[0];
    if (best) {
      progFindings.push({
        severity: "good",
        title: `${best.name}: +${best.changePct}%`,
        detail: `Von ${best.firstE1RM} auf ${best.lastE1RM} kg geschätztes Maximum. Dein bester Treiber — bleib dran.`,
      });
    }
  } else {
    progFindings.push({
      severity: "info",
      title: "Zu wenig Wiederholungen je Übung",
      detail: "Für eine Kraftkurve brauche ich pro Übung mindestens 3 Einheiten. Bleib bei deinen Hauptübungen dran.",
    });
  }

  sections.push({
    key: "progression",
    title: "Kraftentwicklung",
    score: progScore,
    summary:
      topLifts.length > 0
        ? `${topLifts.length} Übungen mit genug Daten ausgewertet.`
        : "Noch keine Übung mit genug Verlauf.",
    metrics: topLifts.slice(0, 4).map((l) => ({
      label: l.name,
      value: `${l.lastE1RM} kg`,
      sub: `${l.changePct > 0 ? "+" : ""}${l.changePct}%`,
    })),
    findings: progFindings,
  });

  /* ===== 5. Intensität & Anstrengung ===== */
  let workingSets = 0;
  let completedSets = 0;
  let allSets = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  let maxedSets = 0; // RPE >= 9.5
  let inGoalRange = 0;
  const goalCfg = GOAL_CONFIG[profile.goal];
  for (const w of done) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (s.setType === "warmup") continue;
        allSets++;
        if (s.isCompleted) completedSets++;
        if (isWorking(s)) {
          workingSets++;
          if (s.reps >= goalCfg.repLow && s.reps <= goalCfg.repHigh) inGoalRange++;
          if (s.rpe !== null) {
            rpeSum += s.rpe;
            rpeCount++;
            if (s.rpe >= 9.5) maxedSets++;
          }
        }
      }
    }
  }
  const avgRpe = rpeCount > 0 ? rpeSum / rpeCount : null;
  const rpeCoverage = workingSets > 0 ? (rpeCount / workingSets) * 100 : 0;
  const completionRate = allSets > 0 ? (completedSets / allSets) * 100 : 0;
  const goalRangeRate = workingSets > 0 ? (inGoalRange / workingSets) * 100 : 0;

  const intFindings: Finding[] = [];
  let intScore = 70;

  if (avgRpe !== null) {
    if (avgRpe < 6.5) {
      intFindings.push({
        severity: "warning",
        title: `Ø RPE ${round(avgRpe, 1)} — zu leicht`,
        detail: "Deine Sätze sind im Schnitt zu locker. Mit so viel Reserve im Tank setzt du kaum Wachstumsreiz. Geh näher ans Limit (RPE 8–9).",
      });
      intScore -= 20;
      addPriority("warning", "Härter trainieren: Arbeitssätze Richtung RPE 8–9 bringen.");
    } else if (avgRpe > 9.2) {
      intFindings.push({
        severity: "warning",
        title: `Ø RPE ${round(avgRpe, 1)} — dauernd am Limit`,
        detail: "Fast jeder Satz bis zum Anschlag. Das frisst Erholung und führt schnell ins Übertraining. Plane Reserve (RIR) und Deloads ein.",
      });
      intScore -= 12;
      addPriority("warning", "Nicht jeden Satz bis zum Versagen — Reserve & Deloads einplanen.");
    } else {
      intFindings.push({
        severity: "good",
        title: `Ø RPE ${round(avgRpe, 1)} — gut dosiert`,
        detail: "Deine Anstrengung liegt im produktiven Bereich (nah am Limit, mit etwas Reserve).",
      });
    }
  } else {
    intFindings.push({
      severity: "info",
      title: "Keine RPE-Daten",
      detail: "Du protokollierst keine Anstrengung (RPE). Ohne das rate ich bei der Steuerung — trag RPE im Workout mit, dann wird der Coach präzise.",
    });
    intScore -= 5;
  }

  if (completionRate < 80 && allSets > 10) {
    intFindings.push({
      severity: "warning",
      title: `Nur ${round(completionRate)}% der Sätze abgeschlossen`,
      detail: "Du brichst überdurchschnittlich viele Sätze ab. Entweder zu ambitioniert geplant oder zu wenig fokussiert.",
    });
    intScore -= 10;
  }

  if (workingSets > 12 && goalRangeRate < 55) {
    intFindings.push({
      severity: "warning",
      title: "Wdh passen nicht zum Ziel",
      detail: `Nur ${round(goalRangeRate)}% deiner Arbeitssätze liegen im Zielbereich ${goalCfg.repLow}–${goalCfg.repHigh} Wdh für „${GOAL_LABELS[profile.goal]}". Dein Training zielt gerade woanders hin als dein Ziel.`,
    });
    intScore -= 12;
    addPriority("warning", `Wiederholungen ans Ziel anpassen (${goalCfg.repLow}–${goalCfg.repHigh} Wdh).`);
  }

  sections.push({
    key: "intensity",
    title: "Intensität & Anstrengung",
    score: clamp(intScore),
    summary:
      avgRpe !== null
        ? `Ø RPE ${round(avgRpe, 1)} bei ${round(rpeCoverage)}% protokollierten Sätzen.`
        : "Anstrengung wird (noch) nicht protokolliert.",
    metrics: [
      { label: "Arbeitssätze", value: String(workingSets) },
      { label: "Ø RPE", value: avgRpe !== null ? round(avgRpe, 1).toString() : "—" },
      { label: "Sätze am Limit", value: String(maxedSets), sub: "RPE ≥ 9,5" },
      { label: "Im Zielbereich", value: `${round(goalRangeRate)}%` },
      { label: "Abgeschlossen", value: `${round(completionRate)}%` },
    ],
    findings: intFindings,
  });

  /* ===== 6. Übungsauswahl ===== */
  // Bewertet, OB die richtigen Übungen trainiert werden: Grundübungen vs.
  // Isolation, Bewegungsmuster-Abdeckung, Vielfalt vs. Zettelchaos und ob
  // Übungen oft genug wiederholt werden, um Fortschritt überhaupt messbar zu
  // machen.
  let compoundSets = 0;
  let isolationSets = 0;
  const exWorkingSets = new Map<string, number>(); // exerciseId -> Arbeitssätze
  const exName = new Map<string, string>();
  for (const w of done) {
    for (const ex of w.exercises) {
      let added = false;
      for (const s of ex.sets) {
        if (!isWorking(s)) continue;
        added = true;
        if (ex.mechanic === "compound") compoundSets++;
        else if (ex.mechanic === "isolation") isolationSets++;
      }
      if (added) {
        exWorkingSets.set(ex.exerciseId, (exWorkingSets.get(ex.exerciseId) ?? 0) + 1);
        exName.set(ex.exerciseId, ex.name);
      }
    }
  }
  const mechSets = compoundSets + isolationSets;
  const distinctExercises = exWorkingSets.size;

  // Fundamentale Bewegungsmuster — Abdeckung über die ganze Historie.
  const PATTERNS: Array<{ label: string; match: RegExp }> = [
    { label: "Kniebeuge (Squat)", match: /(kniebeug|squat|beinpress|hack)/i },
    { label: "Hüftstreckung (Kreuzheben/Hip Hinge)", match: /(kreuzheb|deadlift|hip.?thrust|good.?morning|rdl|romanian)/i },
    { label: "Horizontales Drücken", match: /(bankdr|bench|liegest|dip|brustpress|push.?up)/i },
    { label: "Vertikales Drücken", match: /(schulterdr|overhead|military|ohp|arnold)/i },
    { label: "Horizontales Ziehen (Rudern)", match: /(rudern|row)/i },
    { label: "Vertikales Ziehen (Klimmzug/Latzug)", match: /(klimmzug|pull.?up|chin.?up|latzug|lat.?pull)/i },
  ];
  const trainedNames = [...exName.values()];
  const coveredPatterns = PATTERNS.filter((p) => trainedNames.some((n) => p.match.test(n)));
  const missingPatterns = PATTERNS.filter((p) => !coveredPatterns.includes(p));

  // Übungen, die zu selten wiederholt werden, um Progression zu zeigen.
  const oneOffExercises = [...exWorkingSets.entries()].filter(([, c]) => c === 1).length;

  const selFindings: Finding[] = [];
  let selScore = 75;

  if (mechSets > 0) {
    const compoundPct = (compoundSets / mechSets) * 100;
    if (compoundPct < 40) {
      selFindings.push({
        severity: "warning",
        title: `Nur ${round(compoundPct)}% Grundübungen`,
        detail:
          "Dein Training besteht überwiegend aus Isolationsübungen (Kabel, Maschinen, " +
          "Arme). Die bringen Feinschliff, aber den Großteil an Kraft und Muskelmasse " +
          "holen mehrgelenkige Grundübungen. Bau Kniebeuge, Kreuzheben, Drücken und " +
          "Rudern ins Zentrum.",
      });
      selScore -= 22;
      addPriority("warning", "Mehr Grundübungen ins Zentrum (Kniebeuge, Kreuzheben, Drücken, Rudern).");
    } else if (compoundPct > 85 && distinctExercises >= 4) {
      selFindings.push({
        severity: "info",
        title: `${round(compoundPct)}% Grundübungen — fast nur schwer`,
        detail:
          "Sehr grundübungslastig. Top für Kraft, aber etwas gezielte Isolation " +
          "(Arme, hinterer Schulter, Waden) schließt Lücken und beugt Dysbalancen vor.",
      });
    } else {
      selFindings.push({
        severity: "good",
        title: `${round(compoundPct)}% Grundübungen`,
        detail:
          "Gutes Verhältnis aus mehrgelenkigen Grundübungen und ergänzender Isolation. " +
          "Genau diese Mischung treibt Kraft und Aufbau effizient.",
      });
    }
  }

  // Muster-Abdeckung
  if (done.length >= 4 || distinctExercises >= 4) {
    if (missingPatterns.length === 0) {
      selFindings.push({
        severity: "good",
        title: "Alle Grund-Bewegungsmuster abgedeckt",
        detail: "Drücken, Ziehen, Kniebeuge und Hüftstreckung — alles dabei. So sieht ein vollständiger Plan aus.",
      });
    } else {
      const labels = missingPatterns.map((p) => p.label);
      const sev: Severity = missingPatterns.length >= 3 ? "critical" : "warning";
      selFindings.push({
        severity: sev,
        title: `${missingPatterns.length} Bewegungsmuster fehlen komplett`,
        detail:
          `Nie trainiert: ${labels.join(", ")}. ` +
          "Ein Körper, der nur kennt was er oft macht, wird einseitig stark und " +
          "anfällig. Jedes Grundmuster sollte regelmäßig vorkommen.",
      });
      selScore -= missingPatterns.length >= 3 ? 28 : 14;
      addPriority(sev, `Fehlende Bewegungsmuster ergänzen: ${labels.slice(0, 3).join(", ")}.`);
    }
  }

  // Zettelchaos: viele Übungen, die nur einmal vorkommen → keine Progression messbar.
  if (distinctExercises >= 6 && oneOffExercises / distinctExercises > 0.5) {
    selFindings.push({
      severity: "warning",
      title: "Zu viel Übungs-Hopping",
      detail:
        `${oneOffExercises} von ${distinctExercises} Übungen hast du nur ein einziges Mal ` +
        "gemacht. Wer ständig die Übungen wechselt, kann sich in keiner steigern — und " +
        "Progression ist der eigentliche Wachstumstreiber. Leg dich auf einen Kern von " +
        "Hauptübungen fest und steigere die über Wochen.",
    });
    selScore -= 16;
    addPriority("warning", "Auf einen festen Kern an Hauptübungen festlegen und darin steigern.");
  }

  sections.push({
    key: "selection",
    title: "Übungsauswahl",
    score: clamp(selScore),
    summary:
      mechSets > 0
        ? `${round((compoundSets / mechSets) * 100)}% Grundübungen · ${coveredPatterns.length}/${PATTERNS.length} Bewegungsmuster · ${distinctExercises} Übungen.`
        : "Noch keine Arbeitssätze für eine Bewertung der Übungsauswahl.",
    metrics: [
      { label: "Grundübungs-Sätze", value: String(compoundSets) },
      { label: "Isolations-Sätze", value: String(isolationSets) },
      { label: "Bewegungsmuster", value: `${coveredPatterns.length}/${PATTERNS.length}` },
      { label: "Versch. Übungen", value: String(distinctExercises) },
      { label: "Nur 1× gemacht", value: String(oneOffExercises) },
    ],
    findings: selFindings,
  });

  /* ===== Kraftstandards (rel. Körpergewicht) ===== */
  const standards: StrengthStandard[] = [];
  const bw = profile.bodyweightKg;
  if (bw && bw > 0) {
    const sexMul = profile.sex === "f" ? 0.72 : 1;
    for (const def of STANDARD_KEYS) {
      let best = 0;
      for (const agg of liftMap.values()) {
        if (def.match.test(agg.name)) {
          for (const s of agg.sessions) best = Math.max(best, s.e1rm);
        }
      }
      if (best <= 0) continue;
      const ratio = best / bw;
      const cls = classifyStandard(ratio, def.ratios, sexMul);
      standards.push({
        name: def.label,
        e1rm: round(best, 1),
        ratio: round(ratio, 2),
        level: cls.level,
        nextLevel: cls.nextLevel,
        nextRatio: cls.nextRatio !== null ? round(cls.nextRatio, 2) : null,
      });
    }
  }

  /* ===== Gesamtscore & Urteil ===== */
  const scored = sections.filter((s) => s.score !== null) as (AnalysisSection & {
    score: number;
  })[];
  // Gewichtung: Konsistenz und Progression zählen am meisten.
  const weights: Record<string, number> = {
    consistency: 1.4,
    progression: 1.3,
    volume: 1.0,
    balance: 1.0,
    intensity: 1.1,
    selection: 1.2,
  };
  let wsum = 0;
  let acc = 0;
  for (const s of scored) {
    const wgt = weights[s.key] ?? 1;
    acc += s.score * wgt;
    wsum += wgt;
  }
  const overall = wsum > 0 ? clamp(acc / wsum) : 50;

  // Hartes Urteil aus den schwersten Findings.
  const crit = sections.flatMap((s) => s.findings).filter((f) => f.severity === "critical");
  const warn = sections.flatMap((s) => s.findings).filter((f) => f.severity === "warning");
  let verdict: string;
  if (crit.length >= 2) {
    verdict =
      `Klartext: hier liegt einiges im Argen. ${crit.length} kritische Baustellen und ` +
      `${warn.length} Warnungen. Du trainierst, aber nicht klug genug, um das Maximum ` +
      "rauszuholen. Die gute Nachricht: alles unten ist konkret behebbar.";
  } else if (crit.length === 1) {
    verdict =
      `Im Kern okay, aber eine Sache tut richtig weh: ${crit[0].title.toLowerCase()}. ` +
      `Dazu ${warn.length} kleinere Warnungen. Räum das auf, dann geht die Kurve nach oben.`;
  } else if (warn.length >= 3) {
    verdict =
      `Solide Basis, aber ${warn.length} Stellen bremsen dich. Nichts davon ist dramatisch — ` +
      "in Summe kosten sie dich aber spürbar Fortschritt. Arbeite die Prioritäten von oben ab.";
  } else if (overall >= 78) {
    verdict =
      "Starke Arbeit. Du bist konsequent, steigerst dich und trainierst ausgewogen. " +
      "Auf diesem Niveau zählen Details: kleine Schwächen unten ausbügeln und dranbleiben.";
  } else {
    verdict =
      "Ordentlich unterwegs, ohne grobe Schnitzer. Für den nächsten Sprung brauchst du " +
      "mehr Systematik bei Steigerung und Frequenz — siehe Prioritäten.";
  }

  // Prioritäten ordnen (kritisch zuerst), Duplikate raus, max 6.
  priorities.sort((a, b) => (a.sev === "critical" ? -1 : 1) - (b.sev === "critical" ? -1 : 1));
  const seen = new Set<string>();
  const priorityList: string[] = [];
  for (const p of priorities) {
    if (seen.has(p.text)) continue;
    seen.add(p.text);
    priorityList.push(p.text);
    if (priorityList.length >= 6) break;
  }
  if (priorityList.length === 0) {
    priorityList.push("Weiter so — halte Frequenz und progressive Steigerung bei.");
  }

  const headline = `${gradeFor(overall)} · ${Math.round(overall)}/100`;

  return {
    hasData: true,
    score: Math.round(overall),
    grade: gradeFor(overall),
    headline,
    verdict,
    sections,
    lifts: topLifts,
    standards,
    priorities: priorityList,
    generatedAt: now,
  };
}

/* Kontext für Profilzeile in der UI. */
export function profileLine(profile: CoachProfile): string {
  const parts: string[] = [GOAL_LABELS[profile.goal], EXPERIENCE_LABELS[profile.experience]];
  const a = age(profile);
  if (a !== null) parts.push(`${a} J.`);
  if (profile.bodyweightKg) parts.push(`${profile.bodyweightKg} kg`);
  if (profile.trainingDaysPerWeek) parts.push(`Ziel ${profile.trainingDaysPerWeek}×/Wo`);
  return parts.join(" · ");
}
