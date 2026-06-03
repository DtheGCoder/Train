// Trainings-Wissensdatenbank des Coaches: kompakt zusammengefasste, evidenz-
// orientierte Grundlagen. Bewusst eigene, knappe Formulierungen (keine Zitate),
// als Orientierung gedacht – keine medizinische Beratung. Wird im UI angezeigt
// und von der Plan-Prüfung (reviewRoutine) als Maßstab genutzt.

import { repRange, GOAL_LABELS, type CoachProfile } from "./coach";

/* ---------------- Maßstäbe (für Plan-Check & Hinweise) ---------------- */

// Harte Arbeitssätze pro Muskelgruppe und WOCHE (Orientierungskorridor).
export const WEEKLY_SETS = { low: 10, high: 20, junk: 25 } as const;
// Sinnvolles Maximum pro Muskelgruppe und EINHEIT (darüber dominiert Ermüdung).
export const SESSION_SETS_PER_GROUP = 12;
// Gesamt-Arbeitssätze, ab denen eine Einheit sehr umfangreich wird.
export const SESSION_TOTAL_HIGH = 28;

/* ---------------- Wissensbasis (für die Anzeige) ---------------- */

export type KnowledgeItem = { q: string; a: string };
export type KnowledgeSection = { key: string; title: string; items: KnowledgeItem[] };

export const KNOWLEDGE: KnowledgeSection[] = [
  {
    key: "grundlagen",
    title: "Grundprinzipien",
    items: [
      {
        q: "Progressive Überlastung",
        a: "Muskeln und Kraft wachsen, wenn der Reiz mit der Zeit steigt – mehr Wiederholungen, mehr Last, mehr saubere Sätze oder besserer Bewegungsumfang. Ohne Steigerung über Wochen stagniert der Fortschritt.",
      },
      {
        q: "Spezifität",
        a: "Du wirst gut in dem, was du trainierst. Für Maximalkraft schwer & wenige Wdh, für Muskelaufbau mittlere Wdh nahe ans Limit, für Ausdauer viele Wdh. Übungsauswahl bestimmt, welche Muskeln wachsen.",
      },
      {
        q: "Reiz – Erholung – Anpassung",
        a: "Das Training setzt den Reiz, der Muskel wächst in der Erholung. Ohne ausreichende Erholung (Schlaf, Ernährung, Pausen) bleibt die Anpassung aus oder kehrt sich um (Übertraining).",
      },
      {
        q: "Technik vor Last",
        a: "Sauberer, kontrollierter Bewegungsablauf über den vollen Bewegungsumfang schlägt jedes Ego-Gewicht. Schlechte Technik kostet Reiz und erhöht das Verletzungsrisiko.",
      },
    ],
  },
  {
    key: "wiederholungen",
    title: "Wiederholungen & Intensität",
    items: [
      {
        q: "Wie viele Wiederholungen?",
        a: "Kraft: 3–6 Wdh (~85–95 % vom 1RM). Muskelaufbau: 6–12 Wdh (~67–80 %). Kraftausdauer: 12–20+ Wdh (<67 %). Hypertrophie funktioniert über einen breiten Bereich, solange die Sätze nah ans Limit gehen.",
      },
      {
        q: "RPE & RIR – wie hart?",
        a: "RPE (1–10) beschreibt die Anstrengung, RIR (Reps in Reserve) sind die noch möglichen Wiederholungen am Satzende. RPE 8 ≈ 2 RIR. Für Hypertrophie sind 0–3 RIR ideal, für schwere Kraftarbeit 1–3 RIR – nicht jeder Satz bis zum völligen Versagen.",
      },
      {
        q: "Geschätztes 1RM",
        a: "Aus Gewicht, Wiederholungen und Anstrengung lässt sich das Einmal-Maximum schätzen. Es ist eine Orientierung für Lastsprünge – kein Pflicht-Maximalversuch nötig.",
      },
    ],
  },
  {
    key: "volumen",
    title: "Volumen (Sätze pro Woche)",
    items: [
      {
        q: "Wie viele Sätze pro Muskel und Woche?",
        a: `Richtwert: ~${WEEKLY_SETS.low}–${WEEKLY_SETS.high} harte Sätze pro Muskelgruppe und Woche. Einsteiger profitieren schon von weniger, Fortgeschrittene brauchen oft das obere Ende. Deutlich über ${WEEKLY_SETS.junk} bringt meist v. a. Ermüdung.`,
      },
      {
        q: "Wie viel pro Einheit?",
        a: `Pro Muskelgruppe sind etwa 5–${SESSION_SETS_PER_GROUP} harte Sätze in einer Einheit produktiv. Mehr in einem Rutsch bringt wenig Zusatzreiz – besser über die Woche verteilen.`,
      },
      {
        q: "Volumen langsam steigern",
        a: "Erhöhe das Wochenvolumen über Wochen schrittweise statt sprunghaft. Mehr ist nicht automatisch besser – nur so viel, wie du erholt wegsteckst.",
      },
    ],
  },
  {
    key: "frequenz",
    title: "Frequenz & Aufteilung",
    items: [
      {
        q: "Wie oft pro Muskel?",
        a: "Jede Muskelgruppe ~2× pro Woche zu trainieren ist meist besser als alles in einer Einheit – gleiches Wochenvolumen, aber bessere Qualität je Satz und Reiz.",
      },
      {
        q: "Ganzkörper vs. Split",
        a: "1–3 Einheiten/Woche: Ganzkörper mit Grundübungen. 4–6 Einheiten: Ober-/Unterkörper oder Push/Pull/Legs, um Volumen sinnvoll zu verteilen und je Muskel 2× zu treffen.",
      },
    ],
  },
  {
    key: "pausen",
    title: "Pausen zwischen Sätzen",
    items: [
      {
        q: "Wie lange Pause?",
        a: "Schwere Grundübungen/Kraft: 2–4 min. Hypertrophie: 1,5–3 min – genug, um die Wiederholungen sauber zu halten. Isolation/Kraftausdauer: 0,5–1,5 min. Zu kurze Pausen senken die Leistung pro Satz.",
      },
    ],
  },
  {
    key: "reihenfolge",
    title: "Übungsreihenfolge",
    items: [
      {
        q: "Grundübungen zuerst",
        a: "Mehrgelenkige Grundübungen (Kniebeuge, Bankdrücken, Rudern, Kreuzheben) gehören an den Anfang, solange du frisch bist. Isolation (Curls, Seitheben, Beinstrecker) kommt danach.",
      },
      {
        q: "Schwächen priorisieren",
        a: "Was dir am wichtigsten ist oder hinterherhinkt, früh in der Einheit trainieren – da ist die Leistung am höchsten.",
      },
    ],
  },
  {
    key: "aufwaermen",
    title: "Aufwärmen",
    items: [
      {
        q: "Richtig aufwärmen",
        a: "Kurz allgemein (Kreislauf), dann übungsspezifische Aufwärmsätze als Rampe zum Arbeitsgewicht (mit weniger Wdh, steigender Last). Bei Körpergewichtsübungen ein paar lockere Wiederholungen zum Reinkommen – mit weniger als dem eigenen Körpergewicht aufzuwärmen geht nicht.",
      },
    ],
  },
  {
    key: "progression",
    title: "Progression & Plateaus",
    items: [
      {
        q: "Doppelprogression",
        a: "Bleib bei einem Gewicht und steigere erst die Wiederholungen bis ans obere Ende deiner Spanne. Schaffst du die obere Grenze sauber, erhöhe die Last in kleinen Schritten (1,25–2,5 kg) und beginne wieder unten.",
      },
      {
        q: "Plateau durchbrechen",
        a: "Wenn es 3+ Einheiten nicht vorangeht: Technik & Pausen prüfen, Volumen leicht erhöhen, eine Variation einbauen oder eine Deload-Woche einlegen.",
      },
      {
        q: "Deload",
        a: "Alle 4–8 Wochen (oder bei hartnäckiger Stagnation/Müdigkeit) eine leichtere Woche: Last ~10 % runter oder Sätze halbieren. Das räumt Ermüdung ab, ohne Fortschritt zu verlieren.",
      },
    ],
  },
  {
    key: "erholung",
    title: "Erholung & Schlaf",
    items: [
      {
        q: "Schlaf",
        a: "7–9 Stunden Schlaf sind der stärkste Hebel für Erholung, Kraft und Muskelaufbau. Schlechter Schlaf senkt Leistung und Regeneration messbar.",
      },
      {
        q: "Erholung zwischen Einheiten",
        a: "Dieselbe Muskelgruppe braucht meist ~48 h zur Erholung. Anhaltender Leistungsabfall, schlechter Schlaf oder Reizbarkeit sind Zeichen für zu wenig Erholung.",
      },
    ],
  },
  {
    key: "ernaehrung",
    title: "Ernährung",
    items: [
      {
        q: "Protein",
        a: "~1,6–2,2 g Eiweiß pro kg Körpergewicht und Tag unterstützen Muskelaufbau und -erhalt – sinnvoll über den Tag auf mehrere Mahlzeiten verteilt.",
      },
      {
        q: "Kalorien",
        a: "Muskelaufbau braucht tendenziell einen leichten Überschuss, Fettabbau ein moderates Defizit. Kraft lässt sich auch im Defizit halten, Aufbau ist dort langsamer.",
      },
      {
        q: "Flüssigkeit",
        a: "Gut hydriert trainieren – schon leichte Dehydrierung kostet Kraft und Konzentration.",
      },
    ],
  },
  {
    key: "sicherheit",
    title: "Technik & Sicherheit",
    items: [
      {
        q: "Schmerz vs. Anstrengung",
        a: "Brennende Anstrengung im Muskel ist normal; stechender Gelenk- oder Sehnenschmerz nicht – dann abbrechen. Bei Einschränkungen Übungen wählen, die nicht reizen, und die Region extra aufwärmen.",
      },
      {
        q: "Voller Bewegungsumfang",
        a: "Sauberer, kontrollierter Bewegungsumfang baut mehr Muskeln und beweglichere Gelenke als halbe Teilwiederholungen mit mehr Gewicht.",
      },
    ],
  },
  {
    key: "tracking",
    title: "Tracking & Kontinuität",
    items: [
      {
        q: "Mitschreiben lohnt sich",
        a: "Gewicht, Wiederholungen und RPE festzuhalten macht progressive Überlastung steuerbar – du siehst schwarz auf weiß, ob es vorangeht.",
      },
      {
        q: "Kontinuität schlägt Perfektion",
        a: "Die beste Routine ist die, die du über Monate durchhältst. Regelmäßig solide trainieren bringt mehr als seltene perfekte Einheiten.",
      },
    ],
  },
];

/* ---------------- Plan-Check (eigene Vorlagen prüfen) ---------------- */

const GROUP_OF: Record<string, string> = {
  chest: "Brust",
  back: "Rücken",
  lats: "Rücken",
  traps: "Rücken",
  shoulders: "Schultern",
  biceps: "Arme",
  triceps: "Arme",
  forearms: "Arme",
  quads: "Beine",
  hamstrings: "Beine",
  glutes: "Beine",
  calves: "Beine",
  abs: "Rumpf",
  obliques: "Rumpf",
  lowerback: "Rumpf",
};

// Push-/Pull-Zuordnung für eine grobe Balance-Prüfung.
const PUSH = new Set(["chest", "shoulders", "triceps", "quads"]);
const PULL = new Set(["back", "lats", "traps", "biceps", "hamstrings"]);

export type RoutineExerciseInput = {
  name: string;
  muscleSlug: string;
  mechanic: string; // "compound" | "isolation"
  targetSets: number;
  targetReps: number;
};

export type RoutineFinding = {
  severity: "good" | "info" | "warning";
  title: string;
  detail: string;
};

export type RoutineReview = {
  totalSets: number;
  findings: RoutineFinding[];
};

// Prüft eine Vorlage gegen die Wissensbasis: Struktur, Reihenfolge, Volumen je
// Gruppe, Wdh-Ziele und Balance. Rein deterministisch, auf Basis der Richtwerte.
export function reviewRoutine(
  exercises: RoutineExerciseInput[],
  profile: CoachProfile,
): RoutineReview {
  const findings: RoutineFinding[] = [];
  const totalSets = exercises.reduce((s, e) => s + (e.targetSets || 0), 0);

  if (exercises.length === 0) {
    return {
      totalSets: 0,
      findings: [
        {
          severity: "info",
          title: "Noch keine Übungen",
          detail: "Füge Übungen hinzu, dann prüfe ich Struktur, Sätze und Wiederholungen für dich.",
        },
      ],
    };
  }

  // 1) Reihenfolge: Isolation vor Grundübung?
  let seenIsolation = "";
  for (const e of exercises) {
    if (e.mechanic === "isolation" && !seenIsolation) seenIsolation = e.name;
    else if (e.mechanic === "compound" && seenIsolation) {
      findings.push({
        severity: "warning",
        title: "Grundübungen zuerst",
        detail: `„${e.name}" (Grundübung) steht hinter „${seenIsolation}" (Isolation). Plane mehrgelenkige Grundübungen nach vorn, solange du frisch bist – Isolation danach.`,
      });
      break;
    }
  }

  // 2) Volumen je Muskelgruppe in dieser Einheit.
  const groupSets = new Map<string, number>();
  for (const e of exercises) {
    const g = GROUP_OF[e.muscleSlug];
    if (!g) continue;
    groupSets.set(g, (groupSets.get(g) ?? 0) + (e.targetSets || 0));
  }
  for (const [g, n] of groupSets) {
    if (n > SESSION_SETS_PER_GROUP) {
      findings.push({
        severity: "warning",
        title: `${g}: ${n} Sätze in einer Einheit`,
        detail: `Über ~${SESSION_SETS_PER_GROUP} harte Sätze pro Gruppe und Einheit bringen vor allem Ermüdung statt Reiz. Kürze ${g} oder verteile es auf einen zweiten Tag.`,
      });
    }
  }

  // 3) Gesamtumfang.
  if (totalSets > SESSION_TOTAL_HIGH) {
    findings.push({
      severity: "warning",
      title: `Sehr umfangreich (${totalSets} Sätze)`,
      detail: `Gegen Ende lässt die Kraft nach – die letzten Übungen leiden. Plane realistisch: kürzen, splitten, oder bewusst die ersten Übungen priorisieren.`,
    });
  }

  // 4) Wiederholungs-Ziele vs. deine Zielspanne.
  const { low, high } = repRange(profile);
  const offRange = exercises.filter(
    (e) => e.targetReps > 0 && (e.targetReps < low - 2 || e.targetReps > high + 3),
  );
  if (offRange.length > 0) {
    findings.push({
      severity: "info",
      title: "Wiederholungen passen nicht ganz zum Ziel",
      detail: `Für ${GOAL_LABELS[profile.goal]} liegt deine Spanne bei ~${low}–${high} Wdh. ${offRange.length} ${offRange.length === 1 ? "Übung weicht" : "Übungen weichen"} deutlich ab (z. B. „${offRange[0].name}" mit ${offRange[0].targetReps}). Anpassen, wenn das Ziel passen soll.`,
    });
  }

  // 5) Grobe Push/Pull-Balance.
  let push = 0;
  let pull = 0;
  for (const e of exercises) {
    if (PUSH.has(e.muscleSlug)) push += e.targetSets || 0;
    if (PULL.has(e.muscleSlug)) pull += e.targetSets || 0;
  }
  if (push > 0 && pull > 0 && (push > pull * 2.5 || pull > push * 2.5)) {
    const more = push > pull ? "Druck (Push)" : "Zug (Pull)";
    const less = push > pull ? "Zug (Pull)" : "Druck (Push)";
    findings.push({
      severity: "info",
      title: "Unausgewogen: Push vs. Pull",
      detail: `Deutlich mehr ${more} als ${less}. Auf Dauer begünstigt das Dysbalancen und Haltungsprobleme – ergänze etwas ${less}.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "good",
      title: "Solide aufgebaut",
      detail: "Reihenfolge, Volumen und Wiederholungen passen zu deinem Ziel. Zieh es konsequent durch und steigere progressiv.",
    });
  }

  return { totalSets, findings };
}
