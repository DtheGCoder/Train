// Kuratierte, mehrtägige Trainingsprogramme ("Coach-Pläne"). Jeder Plan ist eine
// geordnete Folge von Trainingstagen, die nacheinander absolviert werden.
// Beim Aktivieren wird daraus pro Tag eine echte Routine für den Nutzer erzeugt.
//
// Wissenschaftliche Grundlage: Ganzkörper für Anfänger (hohe Frequenz pro
// Muskel), Upper/Lower bzw. Push/Pull/Legs für Fortgeschrittene (mehr Volumen
// bei guter Erholung), Kraft über 5×5-Grundübungen, Bodyweight für zuhause.

import type {
  PresetEx,
  PresetGoal,
  PresetLevel,
  PresetLocation,
} from "./seed-data";
import type { CoachProfile } from "./coach";

export type ProgramDaySeed = {
  label: string; // z. B. "Push"
  focus: string; // kurze Beschreibung
  exercises: PresetEx[];
};

export type ProgramSeed = {
  key: string;
  name: string;
  description: string;
  goal: PresetGoal;
  level: PresetLevel;
  location: PresetLocation;
  daysPerWeek: number;
  schedule: string; // wie über die Woche verteilen
  benefits: string;
  rest?: number;
  days: ProgramDaySeed[];
};

export const programs: ProgramSeed[] = [
  /* -------- Ganzkörper 3× (Einstieg) -------- */
  {
    key: "fullbody-3",
    name: "Ganzkörper 3× – Einstieg",
    description: "Drei Ganzkörper-Tage pro Woche für den Start",
    goal: "general",
    level: "beginner",
    location: "gym",
    daysPerWeek: 3,
    schedule: "z. B. Mo / Mi / Fr – immer einen Ruhetag dazwischen.",
    benefits:
      "Jeder Muskel wird 3× pro Woche trainiert – die beste Frequenz für Anfänger, um Technik und Kraft schnell aufzubauen. Drei leicht unterschiedliche Tage halten es abwechslungsreich und ausgewogen.",
    rest: 120,
    days: [
      {
        label: "Tag A – Kniebeuge-Fokus",
        focus: "Beine & Druck",
        exercises: [
          ["Kniebeugen (Langhantel)", 3, 8],
          ["Bankdrücken (Langhantel)", 3, 8],
          ["Kabelrudern sitzend", 3, 10],
          ["Schulterdrücken (Kurzhantel)", 3, 10],
          ["Plank", 3, 45],
        ],
      },
      {
        label: "Tag B – Kreuzheben-Fokus",
        focus: "Hintere Kette & Zug",
        exercises: [
          ["Kreuzheben (Langhantel)", 3, 5],
          ["Schrägbankdrücken (Kurzhantel)", 3, 10],
          ["Latzug (breit)", 3, 10],
          ["Beinpresse", 3, 12],
          ["Crunches", 3, 20],
        ],
      },
      {
        label: "Tag C – Ausgewogen",
        focus: "Ganzkörper rund",
        exercises: [
          ["Frontkniebeugen", 3, 8],
          ["Bankdrücken (Kurzhantel)", 3, 10],
          ["Langhantelrudern", 3, 10],
          ["Seitheben (Kurzhantel)", 3, 15],
          ["Beinheben hängend", 3, 12],
        ],
      },
    ],
  },

  /* -------- Upper / Lower 4× -------- */
  {
    key: "upper-lower-4",
    name: "Upper/Lower 4×",
    description: "Vier Tage: zweimal Oberkörper, zweimal Unterkörper",
    goal: "hypertrophy",
    level: "intermediate",
    location: "gym",
    daysPerWeek: 4,
    schedule: "z. B. Mo Ober / Di Unter / Do Ober / Fr Unter.",
    benefits:
      "Jeder Muskel 2× pro Woche bei hohem Volumen – der Sweet-Spot für Muskelaufbau bei Fortgeschrittenen. Zwei Varianten je Hälfte setzen unterschiedliche Reize.",
    rest: 100,
    days: [
      {
        label: "Oberkörper A",
        focus: "Druck-betont",
        exercises: [
          ["Bankdrücken (Langhantel)", 4, 8],
          ["Langhantelrudern", 4, 8],
          ["Schulterdrücken (Kurzhantel)", 3, 10],
          ["Latzug (breit)", 3, 12],
          ["Trizepsdrücken am Seil", 3, 12],
          ["Bizeps Curls (SZ-Stange)", 3, 10],
        ],
      },
      {
        label: "Unterkörper A",
        focus: "Kniebeuge-betont",
        exercises: [
          ["Kniebeugen (Langhantel)", 4, 8],
          ["Rumänisches Kreuzheben", 3, 10],
          ["Beinpresse", 3, 12],
          ["Beinbeuger liegend", 3, 12],
          ["Wadenheben stehend", 4, 15],
        ],
      },
      {
        label: "Oberkörper B",
        focus: "Zug-betont",
        exercises: [
          ["Klimmzüge (breit)", 4, 8],
          ["Schrägbankdrücken (Kurzhantel)", 4, 10],
          ["Kabelrudern sitzend", 3, 12],
          ["Seitheben (Kurzhantel)", 4, 15],
          ["Hammer Curls (Kurzhantel)", 3, 12],
          ["Überkopf-Trizepsstrecken (Seil)", 3, 12],
        ],
      },
      {
        label: "Unterkörper B",
        focus: "Hüft-betont",
        exercises: [
          ["Kreuzheben (Langhantel)", 3, 5],
          ["Frontkniebeugen", 3, 10],
          ["Bulgarische Kniebeuge", 3, 12],
          ["Beinstrecker", 3, 15],
          ["Wadenheben sitzend", 4, 15],
        ],
      },
    ],
  },

  /* -------- Push / Pull / Legs 6× -------- */
  {
    key: "ppl-6",
    name: "Push/Pull/Legs 6×",
    description: "Sechs Tage – das klassische Volumen-Programm",
    goal: "hypertrophy",
    level: "advanced",
    location: "gym",
    daysPerWeek: 6,
    schedule: "Push/Pull/Legs zweimal pro Woche, z. B. Mo–Sa, So frei.",
    benefits:
      "Maximales wöchentliches Volumen für Erfahrene: jede Muskelgruppe 2× pro Woche mit viel Satz-Umfang. Erfordert gute Erholung, Schlaf und Ernährung.",
    rest: 90,
    days: [
      {
        label: "Push A",
        focus: "Brust-Fokus",
        exercises: [
          ["Bankdrücken (Langhantel)", 4, 8],
          ["Schulterdrücken (Kurzhantel)", 3, 10],
          ["Schrägbankdrücken (Kurzhantel)", 3, 10],
          ["Seitheben (Kurzhantel)", 4, 15],
          ["Trizepsdrücken am Seil", 3, 12],
        ],
      },
      {
        label: "Pull A",
        focus: "Breite",
        exercises: [
          ["Klimmzüge (breit)", 4, 8],
          ["Langhantelrudern", 4, 10],
          ["Latzug (eng)", 3, 12],
          ["Face Pulls", 3, 15],
          ["Bizeps Curls (Langhantel)", 3, 10],
        ],
      },
      {
        label: "Legs A",
        focus: "Kniebeuge",
        exercises: [
          ["Kniebeugen (Langhantel)", 4, 8],
          ["Rumänisches Kreuzheben", 3, 10],
          ["Beinpresse", 3, 12],
          ["Beinbeuger liegend", 3, 12],
          ["Wadenheben stehend", 4, 15],
        ],
      },
      {
        label: "Push B",
        focus: "Schulter-Fokus",
        exercises: [
          ["Schulterdrücken (Langhantel)", 4, 8],
          ["Schrägbankdrücken (Langhantel)", 3, 10],
          ["Butterfly (Maschine)", 3, 12],
          ["Seitheben (Kabel)", 4, 15],
          ["Enges Bankdrücken", 3, 10],
        ],
      },
      {
        label: "Pull B",
        focus: "Dicke",
        exercises: [
          ["Kreuzheben (Langhantel)", 3, 5],
          ["Kabelrudern sitzend", 4, 10],
          ["Latzug (breit)", 3, 12],
          ["Reverse Flys (Maschine)", 3, 15],
          ["Hammer Curls (Kurzhantel)", 3, 12],
        ],
      },
      {
        label: "Legs B",
        focus: "Hüft & Quad",
        exercises: [
          ["Frontkniebeugen", 4, 8],
          ["Hip Thrust (Langhantel)", 3, 10],
          ["Bulgarische Kniebeuge", 3, 12],
          ["Beinstrecker", 3, 15],
          ["Wadenheben sitzend", 4, 15],
        ],
      },
    ],
  },

  /* -------- Kraft 3× (5×5) -------- */
  {
    key: "strength-ab-3",
    name: "Kraft 3× (5×5)",
    description: "Zwei Workouts A/B im Wechsel, dreimal pro Woche",
    goal: "strength",
    level: "beginner",
    location: "gym",
    daysPerWeek: 3,
    schedule:
      "A/B im Wechsel (Woche 1: A-B-A, Woche 2: B-A-B). Immer einen Tag Pause.",
    benefits:
      "Linearer Kraftaufbau nach dem bewährten 5×5-Prinzip: wenige, schwere Grundübungen mit konstanter Steigerung. Baut in wenigen Monaten eine sehr starke Basis auf.",
    rest: 180,
    days: [
      {
        label: "Workout A",
        focus: "Kniebeuge / Bank / Rudern",
        exercises: [
          ["Kniebeugen (Langhantel)", 5, 5],
          ["Bankdrücken (Langhantel)", 5, 5],
          ["Langhantelrudern", 5, 5],
        ],
      },
      {
        label: "Workout B",
        focus: "Kniebeuge / Schulter / Kreuzheben",
        exercises: [
          ["Kniebeugen (Langhantel)", 5, 5],
          ["Schulterdrücken (Langhantel)", 5, 5],
          ["Kreuzheben (Langhantel)", 1, 5],
        ],
      },
    ],
  },

  /* -------- Zuhause 3× (ohne Geräte) -------- */
  {
    key: "home-bw-3",
    name: "Zuhause 3× – ohne Geräte",
    description: "Drei Bodyweight-Tage für daheim",
    goal: "general",
    level: "beginner",
    location: "home",
    daysPerWeek: 3,
    schedule: "z. B. Mo / Mi / Fr. Steigere die Wiederholungen mit der Zeit.",
    benefits:
      "Komplettes Training nur mit dem eigenen Körpergewicht – kein Equipment nötig. Baut Grundkraft, Muskeln und Ausdauer auf. Perfekt für zuhause oder unterwegs.",
    rest: 60,
    days: [
      {
        label: "Tag A – Unterkörper",
        focus: "Beine & Gesäß",
        exercises: [
          ["Kniebeugen ohne Gewicht", 4, 20],
          ["Ausfallschritte (Kurzhantel)", 3, 12],
          ["Glute Bridge", 3, 20],
          ["Wandsitz", 3, 45],
          ["Wadenheben stehend", 4, 20],
        ],
      },
      {
        label: "Tag B – Oberkörper",
        focus: "Druck & Zug",
        exercises: [
          ["Liegestütze", 4, 12],
          ["Diamant-Liegestütze", 3, 10],
          ["Schräge Liegestütze", 3, 12],
          ["Superman", 3, 15],
          ["Plank", 3, 45],
        ],
      },
      {
        label: "Tag C – Ganzkörper & Core",
        focus: "Kondition",
        exercises: [
          ["Burpees", 4, 12],
          ["Mountain Climbers", 4, 30],
          ["Kniebeugen ohne Gewicht", 3, 25],
          ["Liegestütze", 3, 12],
          ["Russian Twists", 3, 20],
        ],
      },
    ],
  },

  /* -------- Definition & Kondition 4× -------- */
  {
    key: "recomp-4",
    name: "Definition & Kondition 4×",
    description: "Krafterhalt plus Stoffwechsel-Training",
    goal: "endurance",
    level: "intermediate",
    location: "both",
    daysPerWeek: 4,
    schedule:
      "2× Kraft (Ober/Unter) + 2× Zirkel/HIIT, z. B. Mo/Di/Do/Fr.",
    benefits:
      "Kombiniert Krafttraining (erhält die Muskeln in der Diät) mit hochintensivem Zirkeltraining (verbrennt Kalorien und verbessert die Kondition). Ideal zum Definieren.",
    rest: 60,
    days: [
      {
        label: "Oberkörper-Kraft",
        focus: "Muskeln erhalten",
        exercises: [
          ["Bankdrücken (Kurzhantel)", 4, 10],
          ["Kurzhantelrudern (einarmig)", 4, 10],
          ["Schulterdrücken (Kurzhantel)", 3, 12],
          ["Bizeps Curls (Kurzhantel)", 3, 12],
          ["Überkopf-Trizepsstrecken (Kurzhantel)", 3, 12],
        ],
      },
      {
        label: "Zirkel A – Stoffwechsel",
        focus: "Puls hoch",
        exercises: [
          ["Kettlebell Swing", 4, 20],
          ["Thruster", 4, 12],
          ["Burpees", 4, 12],
          ["Mountain Climbers", 4, 30],
        ],
      },
      {
        label: "Unterkörper-Kraft",
        focus: "Beine erhalten",
        exercises: [
          ["Goblet Squat", 4, 12],
          ["Rumänisches Kreuzheben", 4, 10],
          ["Ausfallschritte (Kurzhantel)", 3, 12],
          ["Glute Bridge", 3, 15],
          ["Wadenheben stehend", 4, 20],
        ],
      },
      {
        label: "Zirkel B – HIIT & Core",
        focus: "Fettverbrennung",
        exercises: [
          ["Box Jumps", 4, 12],
          ["Seilspringen", 4, 60],
          ["Russian Twists", 4, 20],
          ["Plank", 4, 45],
        ],
      },
    ],
  },
];

export function getProgram(key: string): ProgramSeed | undefined {
  return programs.find((p) => p.key === key);
}

/* ---------------- Profil-Vollständigkeit ---------------- */

export type ProfileGap = { field: string; label: string; why: string };

// Welche Profilangaben fehlen, damit der Coach einen 100 % sicheren, logischen
// Plan erstellen kann? Wir prüfen die Angaben, die wir nicht erraten können.
export function missingProfileForProgram(p: CoachProfile): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!p.trainingDaysPerWeek) {
    gaps.push({
      field: "trainingDaysPerWeek",
      label: "Trainingstage pro Woche",
      why: "bestimmt, welcher Split (3er, 4er oder 6er) überhaupt zu deinem Alltag passt.",
    });
  }
  if (!p.bodyweightKg) {
    gaps.push({
      field: "bodyweightKg",
      label: "Körpergewicht",
      why: "Grundlage für realistische Startgewichte und Belastungssteuerung.",
    });
  }
  if (!p.birthYear) {
    gaps.push({
      field: "birthYear",
      label: "Geburtsjahr",
      why: "das Alter beeinflusst Erholung, Volumen und Aufwärmen.",
    });
  }
  if (!p.sex) {
    gaps.push({
      field: "sex",
      label: "Geschlecht",
      why: "feinjustiert Volumen- und Kraftrichtwerte.",
    });
  }
  return gaps;
}

/* ---------------- Empfehlung ---------------- */

export type ProgramMatch = {
  program: ProgramSeed;
  score: number;
  reasons: string[];
};

// Hat der Nutzer (laut Equipment) ein Studio zur Verfügung?
function hasGymEquipment(p: CoachProfile): boolean {
  const eq = (p.availableEquipment ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (eq.length === 0) return true; // nichts gewählt = alles verfügbar
  return eq.some((e) =>
    ["barbell", "machine", "cable", "smith"].includes(e),
  );
}

// Bewertet alle Programme gegen das Profil und gibt die passendsten zuerst.
export function recommendPrograms(p: CoachProfile): ProgramMatch[] {
  const gym = hasGymEquipment(p);
  const days = p.trainingDaysPerWeek ?? 0;

  const matches = programs.map((program) => {
    let score = 0;
    const reasons: string[] = [];

    // Ziel
    if (program.goal === p.goal) {
      score += 40;
      reasons.push("passt zu deinem Ziel");
    } else if (p.goal === "fatloss" && program.goal === "endurance") {
      // Beim Abnehmen sind Kondition/Stoffwechsel-Pläne ideal.
      score += 38;
      reasons.push("Kondition & Kalorienverbrauch fürs Abnehmen");
    } else if (p.goal === "fatloss" && program.goal === "hypertrophy") {
      // Krafttraining erhält die Muskeln in der Diät.
      score += 20;
      reasons.push("erhält Muskeln in der Diät");
    } else if (program.goal === "general") {
      score += 15;
    }

    // Level
    if (program.level === p.experience) {
      score += 25;
      reasons.push("passt zu deinem Level");
    } else {
      // ein Level daneben ist noch ok, zwei nicht
      const order = ["beginner", "intermediate", "advanced"];
      const d = Math.abs(
        order.indexOf(program.level) - order.indexOf(p.experience),
      );
      score += d === 1 ? 10 : 0;
    }

    // Trainingstage
    if (days > 0) {
      const diff = Math.abs(program.daysPerWeek - days);
      if (diff === 0) {
        score += 25;
        reasons.push(`${program.daysPerWeek} Tage/Woche wie gewünscht`);
      } else if (diff === 1) {
        score += 12;
      }
    }

    // Ort / Equipment
    if (program.location === "home" || program.location === "both") {
      score += gym ? 5 : 25;
      if (!gym) reasons.push("ohne Studio machbar");
    } else if (program.location === "gym") {
      score += gym ? 15 : -20;
    }

    return { program, score, reasons };
  });

  return matches.sort((a, b) => b.score - a.score);
}
