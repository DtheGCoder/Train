// Ernährungs-Coach: berechnet aus den persönlichen Angaben + Trainingskontext
// Tagesziele (Kalorien, Protein, Kohlenhydrate, Fett, Wasser), einen abhakbaren
// Tagesplan, Supplement-Dosierungen und die optimale Zufuhr nach dem Training.
// Reine, deterministische Logik (kein LLM). Wissenschaftliche Grundlage:
// Mifflin-St-Jeor-Grundumsatz, Aktivitätsfaktor, Protein 1.6–2.2 g/kg.

import type { CoachProfile } from "./coach";
import { FOODS, MEALS, scaleFood } from "./food-db";
import type { Food, MealRec } from "./food-db";

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type NutritionTargets = Macros & {
  waterMl: number;
  bmr: number;
  tdee: number;
  proteinPerKg: number;
  isTrainingDay: boolean;
  goalLabel: string;
  note: string;
};

const ACTIVITY = (daysPerWeek: number | null): number => {
  const d = daysPerWeek ?? 3;
  if (d <= 0) return 1.2;
  if (d <= 2) return 1.375;
  if (d <= 4) return 1.55;
  if (d <= 6) return 1.725;
  return 1.9;
};

function keyOf(d: Date): string {
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Lokaler Tagesschlüssel YYYY-MM-DD.
export function todayKey(): string {
  return keyOf(new Date());
}

export function yesterdayKey(): string {
  return keyOf(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

// Wochentag heute als ISO (1 = Mo … 7 = So).
export function isoWeekdayToday(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

// Tagesziele. Braucht das Körpergewicht; Größe/Alter werden sonst geschätzt.
export function nutritionTargets(
  profile: CoachProfile,
  opts: { isTrainingDay: boolean; age: number | null },
): NutritionTargets | null {
  const kg = profile.bodyweightKg;
  if (!kg || kg < 30) return null;

  const sex = profile.sex === "f" ? "f" : profile.sex === "m" ? "m" : "x";
  const cm = profile.heightCm ?? (sex === "f" ? 166 : sex === "m" ? 178 : 172);
  const a = opts.age ?? 30;

  // Grundumsatz (Mifflin-St-Jeor); ohne Geschlecht der Mittelwert.
  const base = 10 * kg + 6.25 * cm - 5 * a;
  const bmr = sex === "m" ? base + 5 : sex === "f" ? base - 161 : base - 78;
  const tdee = bmr * ACTIVITY(profile.trainingDaysPerWeek);

  // Ziel-Anpassung (Überschuss/Defizit). Abnehmen = ~20 % Defizit, an
  // Trainingstagen etwas mehr (für Leistung & Muskelerhalt).
  const goalAdj =
    profile.goal === "hypertrophy"
      ? 1.1
      : profile.goal === "strength"
        ? 1.05
        : profile.goal === "fatloss"
          ? 0.8
          : 1.0;
  // Im Defizit fällt der Trainingstags-Bonus kleiner aus.
  const dayBonus = profile.goal === "fatloss" ? 0.03 : 0.05;
  const dayAdj = opts.isTrainingDay ? 1 + dayBonus : 1.0;
  const kcal = round(tdee * goalAdj * dayAdj, 10);

  // Im Defizit Protein hoch halten (Muskelerhalt).
  const proteinPerKg =
    profile.goal === "hypertrophy"
      ? 2.0
      : profile.goal === "strength"
        ? 1.9
        : profile.goal === "fatloss"
          ? 2.2
          : 1.6;
  const protein = round(kg * proteinPerKg);
  const fat = round(kg * (profile.goal === "fatloss" ? 0.8 : 0.9));
  const usedKcal = protein * 4 + fat * 9;
  const carbs = Math.max(0, round((kcal - usedKcal) / 4));
  const waterMl = round(kg * 35 + (opts.isTrainingDay ? 600 : 0), 50);

  const goalLabel =
    profile.goal === "hypertrophy"
      ? "Muskelaufbau (leichter Überschuss)"
      : profile.goal === "strength"
        ? "Kraft (kleiner Überschuss)"
        : profile.goal === "fatloss"
          ? "Abnehmen (Kaloriendefizit)"
          : "Kraftausdauer (Erhalt)";

  const note =
    profile.goal === "fatloss"
      ? opts.isTrainingDay
        ? "Abnehm-Modus: moderates Defizit, aber Protein hoch & rund ums Training ein paar Kohlenhydrate mehr für die Leistung."
        : "Abnehm-Modus: Kaloriendefizit, viel Protein und Gemüse halten dich satt – die Muskeln bleiben erhalten."
      : opts.isTrainingDay
        ? "Trainingstag: etwas mehr Kalorien & Kohlenhydrate für Leistung und Erholung."
        : "Ruhetag: etwas weniger Kohlenhydrate, Protein bleibt hoch.";

  return {
    kcal,
    protein,
    carbs,
    fat,
    waterMl,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    proteinPerKg,
    isTrainingDay: opts.isTrainingDay,
    goalLabel,
    note,
  };
}

export type PlanKind = "meal" | "shake" | "supp";
export type PlanItem = {
  key: string;
  label: string;
  time: string;
  kind: PlanKind;
  macros: Macros;
  dose?: string;
  hint?: string;
};

const m = (kcal: number, protein: number, carbs: number, fat: number): Macros => ({
  kcal: round(kcal, 5),
  protein: round(protein),
  carbs: round(carbs),
  fat: round(fat),
});

// Supplemente mit Dosierung (abhakbar, keine Makros).
export function supplementItems(): PlanItem[] {
  return [
    {
      key: "creatine",
      label: "Kreatin-Monohydrat",
      time: "täglich, egal wann",
      kind: "supp",
      macros: m(0, 0, 0, 0),
      dose: "3–5 g",
      hint: "Eines der best belegten Supplemente für Kraft & Muskel.",
    },
    {
      key: "vitd",
      label: "Vitamin D3",
      time: "morgens zur Mahlzeit",
      kind: "supp",
      macros: m(0, 0, 0, 0),
      dose: "1000–2000 IE",
      hint: "Besonders im Winter sinnvoll.",
    },
    {
      key: "omega3",
      label: "Omega-3 (Fischöl)",
      time: "zur Mahlzeit",
      kind: "supp",
      macros: m(0, 0, 0, 0),
      dose: "1–2 g EPA/DHA",
      hint: "Unterstützt Herz, Gelenke und Regeneration.",
    },
  ];
}

/* ---------------- Lebensmittel-Datenbank (siehe food-db.ts) ---------------- */

export {
  FOODS,
  FOOD_CATEGORIES,
  MEALS,
  scaleFood,
  defaultQty,
} from "./food-db";
export type { Food, FoodTag, FoodCategory, MealRec } from "./food-db";

export type Remaining = Macros;

export function remainingMacros(target: NutritionTargets, consumed: Macros): Remaining {
  return {
    kcal: Math.round(target.kcal - consumed.kcal),
    protein: Math.round(target.protein - consumed.protein),
    carbs: Math.round(target.carbs - consumed.carbs),
    fat: Math.round(target.fat - consumed.fat),
  };
}

export type FoodSuggestion = { food: Food; qty: number; macros: Macros; reason: string };
export type FoodCoach = {
  headline: string;
  detail: string;
  foods: FoodSuggestion[];
  meal: MealRec | null;
};

// Konkrete Essens-Empfehlung auf Basis der noch offenen Makros.
export function foodCoach(
  target: NutritionTargets,
  consumed: Macros,
): FoodCoach {
  const rem = remainingMacros(target, consumed);
  const proteinGap = rem.protein;
  const kcalGap = rem.kcal;
  const carbsGap = rem.carbs;

  const pick = (id: string, qty: number, reason: string): FoodSuggestion | null => {
    const food = FOODS.find((f) => f.id === id);
    if (!food) return null;
    return { food, qty, macros: scaleFood(food, qty), reason };
  };

  const foods: FoodSuggestion[] = [];

  // Über dem Kalorienziel → leichte, sättigende Optionen.
  if (kcalGap <= 0) {
    return {
      headline: "Kalorienziel erreicht 🎉",
      detail:
        "Du hast dein Tagesziel erreicht. Wenn du noch Hunger hast, greif zu kalorienarmem Gemüse – das sättigt ohne viel Kalorien.",
      foods: [
        pick("cucumber", 200, "fast keine Kalorien"),
        pick("broccoli", 150, "viel Volumen, kaum Kalorien"),
      ].filter(Boolean) as FoodSuggestion[],
      meal: null,
    };
  }

  // Protein ist der wichtigste Hebel.
  if (proteinGap >= 25) {
    foods.push(
      pick("quark", 250, `+${scaleFood(FOODS.find((f) => f.id === "quark")!, 250).protein} g Protein, kaum Fett`)!,
      pick("chicken", 150, "mageres Protein")!,
      pick("whey", 1, "schnell & einfach")!,
    );
  } else if (proteinGap >= 12) {
    foods.push(
      pick("skyr", 200, "leichtes Protein")!,
      pick("egg", 2, "vielseitig")!,
    );
  }

  // Kohlenhydrate auffüllen (Energie / Trainingstag).
  if (carbsGap >= 40) {
    foods.push(
      pick("rice", 150, "saubere Energie")!,
      pick("oats", 60, "lange satt")!,
      pick("banana", 1, "schnelle Energie")!,
    );
  } else if (carbsGap >= 20) {
    foods.push(pick("potato", 200, "sättigend")!);
  }

  // Immer ein Gemüse/Mikronährstoff-Tipp.
  foods.push(pick("broccoli", 150, "Vitamine & Ballaststoffe")!);

  // Beste passende Mahlzeit für den verbleibenden Tagesrest.
  let meal: MealRec | null = null;
  if (kcalGap >= 300) {
    const scored = MEALS.map((ml) => {
      // Passt die Mahlzeit zur Restverteilung? (Protein priorisiert, kcal nicht sprengen)
      const over = Math.max(0, ml.macros.kcal - kcalGap);
      const proteinFit = Math.min(ml.macros.protein, Math.max(0, proteinGap));
      return { ml, score: proteinFit * 3 - over * 0.05 };
    }).sort((a, b) => b.score - a.score);
    meal = scored[0]?.ml ?? null;
  }

  const headline =
    proteinGap >= 20
      ? `Dir fehlen noch ~${proteinGap} g Protein`
      : kcalGap >= 400
        ? `Noch ~${kcalGap} kcal bis zum Ziel`
        : "Fast am Ziel – fein abrunden";

  const detail =
    proteinGap >= 20
      ? "Protein ist der wichtigste Baustein für deine Muskeln. Diese Optionen schließen die Lücke effizient:"
      : kcalGap >= 400
        ? "Füll die Energie mit hochwertigen Kohlenhydraten und etwas Protein auf:"
        : "Nur noch ein kleiner Rest – ideal für einen Snack oder etwas Gemüse:";

  // Duplikate raus, auf 5 begrenzen.
  const seen = new Set<string>();
  const unique = foods.filter((f) => {
    if (!f || seen.has(f.food.id)) return false;
    seen.add(f.food.id);
    return true;
  });

  return { headline, detail, foods: unique.slice(0, 5), meal };
}

// Optimale Zufuhr direkt nach dem Training, skaliert mit dem Umfang der Einheit.
export type PostWorkout = { protein: number; carbs: number; text: string };
export function postWorkoutNutrition(
  profile: CoachProfile,
  session: { hardSets: number },
): PostWorkout {
  const kg = profile.bodyweightKg ?? 75;
  const protein = round(Math.min(40, Math.max(25, kg * 0.4)));
  // Mehr Sätze → mehr entleerte Speicher → mehr Kohlenhydrate.
  const carbsPerKg = session.hardSets >= 18 ? 1.0 : session.hardSets >= 10 ? 0.8 : 0.5;
  const carbs = round(kg * carbsPerKg, 5);
  return {
    protein,
    carbs,
    text: `In den nächsten 1–2 Stunden ~${protein} g Protein und ~${carbs} g Kohlenhydrate – das startet Muskelaufbau und füllt die Energiespeicher wieder auf.`,
  };
}

// Coach-Tipps zur Ernährung, abgestimmt auf Ziel + Trainingskontext (Langzeit).
export function nutritionTips(
  profile: CoachProfile,
  ctx: {
    isTrainingDay: boolean;
    trainedToday: boolean;
    hardYesterday: boolean;
    weekTrainingDays: number;
    proteinTargetHitRate: number | null; // 0..1 über letzte Tage, oder null
  },
): string[] {
  const tips: string[] = [];

  if (ctx.isTrainingDay || ctx.trainedToday) {
    tips.push(
      "Heute ist Trainingstag – plane die meisten Kohlenhydrate um die Einheit (davor für Energie, danach für Erholung).",
    );
  } else {
    tips.push(
      "Ruhetag – halte Protein hoch (Erholung läuft weiter), Kohlenhydrate darfst du etwas senken.",
    );
  }

  if (ctx.hardYesterday) {
    tips.push(
      "Gestern hart trainiert: heute besonders auf genug Protein, Wasser und Schlaf achten – da passiert das Wachstum.",
    );
  }

  if (profile.goal === "hypertrophy") {
    tips.push(
      "Für Muskelaufbau brauchst du einen leichten Kalorienüberschuss. Steigt dein Gewicht über Wochen nicht, iss etwas mehr.",
    );
  } else if (profile.goal === "fatloss") {
    tips.push(
      "Zum Abnehmen zählt das Kaloriendefizit – das Tracking hier hilft enorm. Verlierst du über 2 Wochen gar nichts, iss ~150–200 kcal weniger.",
    );
    tips.push(
      "Halte beim Abnehmen das Protein hoch und trainiere weiter mit Gewichten – so verlierst du Fett statt Muskeln. Mehr Training = mehr Spielraum beim Essen.",
    );
  } else if (profile.goal === "endurance") {
    tips.push(
      "Zum Definieren ein moderates Defizit halten, Protein aber hoch lassen, damit Muskeln erhalten bleiben.",
    );
  }

  if (ctx.proteinTargetHitRate !== null && ctx.proteinTargetHitRate < 0.6) {
    tips.push(
      "Dein Protein lag zuletzt oft unter dem Ziel – ein Eiweißshake oder Quark/Hühnchen pro Tag schließt die Lücke.",
    );
  }

  tips.push(
    "Trinke über den Tag verteilt – Durst ist schon ein spätes Signal. Zum Training eine Extraportion.",
  );

  return tips.slice(0, 5);
}
