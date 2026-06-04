// Ernährungs-Coach: berechnet aus den persönlichen Angaben + Trainingskontext
// Tagesziele (Kalorien, Protein, Kohlenhydrate, Fett, Wasser), einen abhakbaren
// Tagesplan, Supplement-Dosierungen und die optimale Zufuhr nach dem Training.
// Reine, deterministische Logik (kein LLM). Wissenschaftliche Grundlage:
// Mifflin-St-Jeor-Grundumsatz, Aktivitätsfaktor, Protein 1.6–2.2 g/kg.

import type { CoachProfile } from "./coach";

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

  // Ziel-Anpassung (Überschuss/Defizit) + an Trainingstagen etwas mehr.
  const goalAdj =
    profile.goal === "hypertrophy" ? 1.1 : profile.goal === "strength" ? 1.05 : 1.0;
  const dayAdj = opts.isTrainingDay ? 1.05 : 1.0;
  const kcal = round(tdee * goalAdj * dayAdj, 10);

  const proteinPerKg =
    profile.goal === "hypertrophy" ? 2.0 : profile.goal === "strength" ? 1.9 : 1.6;
  const protein = round(kg * proteinPerKg);
  const fat = round(kg * 0.9); // ~0.9 g/kg
  const usedKcal = protein * 4 + fat * 9;
  const carbs = Math.max(0, round((kcal - usedKcal) / 4));
  const waterMl = round(kg * 35 + (opts.isTrainingDay ? 600 : 0), 50);

  const goalLabel =
    profile.goal === "hypertrophy"
      ? "Muskelaufbau (leichter Überschuss)"
      : profile.goal === "strength"
        ? "Kraft (kleiner Überschuss)"
        : "Kraftausdauer (Erhalt)";

  const note = opts.isTrainingDay
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

/* ---------------- Lebensmittel-Datenbank ---------------- */

export type FoodTag = "protein" | "carb" | "fat" | "veg" | "fruit" | "snack";
export type Food = {
  id: string;
  name: string;
  unit: "g" | "Stück" | "Portion";
  base: number; // Bezugsmenge, auf die sich die Makros beziehen
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodTag[];
};

// Kompakte Datenbank gängiger Lebensmittel (Makros je Bezugsmenge).
export const FOODS: Food[] = [
  // Proteinquellen
  { id: "chicken", name: "Hähnchenbrust", unit: "g", base: 100, kcal: 165, protein: 31, carbs: 0, fat: 3.6, tags: ["protein"] },
  { id: "turkey", name: "Putenbrust", unit: "g", base: 100, kcal: 135, protein: 29, carbs: 0, fat: 1, tags: ["protein"] },
  { id: "beef", name: "Rindfleisch (mager)", unit: "g", base: 100, kcal: 187, protein: 26, carbs: 0, fat: 9, tags: ["protein"] },
  { id: "salmon", name: "Lachs", unit: "g", base: 100, kcal: 208, protein: 20, carbs: 0, fat: 13, tags: ["protein", "fat"] },
  { id: "tuna", name: "Thunfisch (Dose)", unit: "g", base: 100, kcal: 116, protein: 26, carbs: 0, fat: 1, tags: ["protein"] },
  { id: "egg", name: "Ei", unit: "Stück", base: 1, kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3, tags: ["protein", "fat"] },
  { id: "eggwhite", name: "Eiklar", unit: "Stück", base: 1, kcal: 17, protein: 3.6, carbs: 0.2, fat: 0.1, tags: ["protein"] },
  { id: "quark", name: "Magerquark", unit: "g", base: 100, kcal: 67, protein: 12, carbs: 4, fat: 0.3, tags: ["protein"] },
  { id: "skyr", name: "Skyr", unit: "g", base: 100, kcal: 63, protein: 11, carbs: 4, fat: 0.2, tags: ["protein"] },
  { id: "greekyog", name: "Griechischer Joghurt", unit: "g", base: 100, kcal: 97, protein: 9, carbs: 4, fat: 5, tags: ["protein"] },
  { id: "cottage", name: "Hüttenkäse", unit: "g", base: 100, kcal: 98, protein: 11, carbs: 3, fat: 4.3, tags: ["protein"] },
  { id: "tofu", name: "Tofu", unit: "g", base: 100, kcal: 144, protein: 15, carbs: 3, fat: 9, tags: ["protein"] },
  { id: "whey", name: "Whey-Protein", unit: "Portion", base: 1, kcal: 120, protein: 24, carbs: 3, fat: 2, tags: ["protein"] },
  { id: "lentils", name: "Linsen (gekocht)", unit: "g", base: 100, kcal: 116, protein: 9, carbs: 20, fat: 0.4, tags: ["protein", "carb"] },
  // Kohlenhydrate
  { id: "rice", name: "Reis (gekocht)", unit: "g", base: 100, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, tags: ["carb"] },
  { id: "potato", name: "Kartoffeln (gekocht)", unit: "g", base: 100, kcal: 87, protein: 2, carbs: 20, fat: 0.1, tags: ["carb"] },
  { id: "sweetpotato", name: "Süßkartoffel", unit: "g", base: 100, kcal: 90, protein: 2, carbs: 21, fat: 0.1, tags: ["carb"] },
  { id: "pasta", name: "Nudeln (gekocht)", unit: "g", base: 100, kcal: 158, protein: 6, carbs: 31, fat: 0.9, tags: ["carb"] },
  { id: "oats", name: "Haferflocken", unit: "g", base: 100, kcal: 372, protein: 13, carbs: 59, fat: 7, tags: ["carb"] },
  { id: "bread", name: "Vollkornbrot", unit: "Stück", base: 1, kcal: 110, protein: 5, carbs: 19, fat: 1.5, tags: ["carb"] },
  { id: "couscous", name: "Couscous (gekocht)", unit: "g", base: 100, kcal: 112, protein: 3.8, carbs: 23, fat: 0.2, tags: ["carb"] },
  // Obst
  { id: "banana", name: "Banane", unit: "Stück", base: 1, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, tags: ["fruit", "carb"] },
  { id: "apple", name: "Apfel", unit: "Stück", base: 1, kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, tags: ["fruit"] },
  { id: "berries", name: "Beeren", unit: "g", base: 100, kcal: 52, protein: 1, carbs: 12, fat: 0.3, tags: ["fruit", "veg"] },
  // Gemüse
  { id: "broccoli", name: "Brokkoli", unit: "g", base: 100, kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, tags: ["veg"] },
  { id: "spinach", name: "Spinat", unit: "g", base: 100, kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, tags: ["veg"] },
  { id: "greens", name: "Gemüse-Mix", unit: "g", base: 100, kcal: 40, protein: 2, carbs: 7, fat: 0.5, tags: ["veg"] },
  { id: "cucumber", name: "Gurke", unit: "g", base: 100, kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, tags: ["veg"] },
  // Fette / Sonstiges
  { id: "almonds", name: "Mandeln", unit: "g", base: 30, kcal: 174, protein: 6, carbs: 6, fat: 15, tags: ["fat", "snack"] },
  { id: "peanutbutter", name: "Erdnussbutter", unit: "g", base: 20, kcal: 118, protein: 5, carbs: 4, fat: 10, tags: ["fat", "snack"] },
  { id: "oliveoil", name: "Olivenöl", unit: "g", base: 10, kcal: 88, protein: 0, carbs: 0, fat: 10, tags: ["fat"] },
  { id: "avocado", name: "Avocado", unit: "Stück", base: 1, kcal: 240, protein: 3, carbs: 12, fat: 22, tags: ["fat"] },
  { id: "darkchoc", name: "Zartbitterschokolade", unit: "g", base: 20, kcal: 120, protein: 1.5, carbs: 9, fat: 8, tags: ["snack", "fat"] },
  { id: "ricecake", name: "Reiswaffel", unit: "Stück", base: 1, kcal: 35, protein: 0.7, carbs: 7, fat: 0.3, tags: ["snack", "carb"] },
];

// Makros eines Lebensmittels für eine Menge (qty in der jeweiligen Einheit).
export function scaleFood(food: Food, qty: number): Macros {
  const f = qty / food.base;
  return {
    kcal: round(food.kcal * f),
    protein: Math.round(food.protein * f * 10) / 10,
    carbs: Math.round(food.carbs * f * 10) / 10,
    fat: Math.round(food.fat * f * 10) / 10,
  };
}

export function defaultQty(food: Food): number {
  if (food.unit === "Stück" || food.unit === "Portion") return 1;
  return 100; // g
}

/* ---------------- Mahlzeit-Empfehlungen ---------------- */

export type MealRec = {
  id: string;
  name: string;
  desc: string;
  macros: Macros;
};

export const MEALS: MealRec[] = [
  { id: "chicken-rice", name: "Hähnchen, Reis & Brokkoli", desc: "150 g Hähnchen · 150 g Reis · 150 g Brokkoli", macros: m(248 + 195 + 51, 47 + 4 + 4.2, 0 + 42 + 10.5, 5.4 + 0.5 + 0.6) },
  { id: "quark-bowl", name: "Quark-Bowl", desc: "250 g Magerquark · 100 g Beeren · 40 g Haferflocken", macros: m(168 + 52 + 149, 30 + 1 + 5, 10 + 12 + 24, 0.8 + 0.3 + 2.8) },
  { id: "salmon-potato", name: "Lachs mit Kartoffeln", desc: "150 g Lachs · 200 g Kartoffeln · Gemüse", macros: m(312 + 174 + 40, 30 + 4 + 2, 0 + 40 + 7, 19.5 + 0.2 + 0.5) },
  { id: "oat-whey", name: "Haferflocken-Shake", desc: "60 g Haferflocken · 1 Whey · 1 Banane", macros: m(223 + 120 + 105, 7.8 + 24 + 1.3, 35 + 3 + 27, 4.2 + 2 + 0.4) },
  { id: "eggs-bread", name: "Rührei mit Vollkornbrot", desc: "3 Eier · 2 Scheiben Vollkornbrot · Gemüse", macros: m(234 + 220 + 30, 19 + 10 + 2, 2 + 38 + 6, 16 + 3 + 0.5) },
  { id: "tofu-stirfry", name: "Tofu-Pfanne mit Reis", desc: "150 g Tofu · 150 g Reis · 200 g Gemüse", macros: m(216 + 195 + 80, 22.5 + 4 + 4, 4.5 + 42 + 14, 13.5 + 0.5 + 1) },
  { id: "tuna-salad", name: "Thunfisch-Salat", desc: "1 Dose Thunfisch · Salat · 1 EL Olivenöl", macros: m(150 + 40 + 88, 33 + 2 + 0, 0 + 7 + 0, 1.5 + 0.5 + 10) },
];

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
