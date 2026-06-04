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

// Abhakbarer Tagesplan: Mahlzeiten (summieren ~ auf die Ziele), Post-Workout-
// Shake an Trainingstagen, Supplemente mit Dosierung.
export function planItems(t: NutritionTargets): PlanItem[] {
  const items: PlanItem[] = [];
  // Mahlzeiten-Verteilung (Anteile am Tagesziel).
  const meals: { key: string; label: string; time: string; share: number }[] =
    t.isTrainingDay
      ? [
          { key: "breakfast", label: "Frühstück", time: "morgens", share: 0.25 },
          { key: "lunch", label: "Mittagessen", time: "mittags", share: 0.3 },
          { key: "preworkout", label: "Snack vor dem Training", time: "ca. 1–2 h vorher", share: 0.1 },
          { key: "dinner", label: "Abendessen", time: "abends", share: 0.25 },
        ]
      : [
          { key: "breakfast", label: "Frühstück", time: "morgens", share: 0.3 },
          { key: "lunch", label: "Mittagessen", time: "mittags", share: 0.35 },
          { key: "snack", label: "Snack", time: "nachmittags", share: 0.1 },
          { key: "dinner", label: "Abendessen", time: "abends", share: 0.25 },
        ];
  for (const meal of meals) {
    items.push({
      key: meal.key,
      label: meal.label,
      time: meal.time,
      kind: "meal",
      macros: m(
        t.kcal * meal.share,
        t.protein * meal.share,
        t.carbs * meal.share,
        t.fat * meal.share,
      ),
    });
  }

  if (t.isTrainingDay) {
    // Post-Workout: ~0.4 g/kg-äquivalent als fixer Shake (vereinfachte 30 g P).
    items.push({
      key: "postworkout",
      label: "Post-Workout-Shake",
      time: "direkt nach dem Training",
      kind: "shake",
      macros: m(220, 35, 25, 1),
      hint: "Protein + schnelle Kohlenhydrate starten die Erholung.",
    });
  }

  // Supplemente (Dosierung, keine Makros).
  items.push({
    key: "creatine",
    label: "Kreatin-Monohydrat",
    time: "täglich, egal wann",
    kind: "supp",
    macros: m(0, 0, 0, 0),
    dose: "3–5 g",
    hint: "Eines der best belegten Supplemente für Kraft & Muskel.",
  });
  items.push({
    key: "vitd",
    label: "Vitamin D3",
    time: "morgens zur Mahlzeit",
    kind: "supp",
    macros: m(0, 0, 0, 0),
    dose: "1000–2000 IE",
    hint: "Besonders im Winter sinnvoll.",
  });
  items.push({
    key: "omega3",
    label: "Omega-3 (Fischöl)",
    time: "zur Mahlzeit",
    kind: "supp",
    macros: m(0, 0, 0, 0),
    dose: "1–2 g EPA/DHA",
    hint: "Unterstützt Herz, Gelenke und Regeneration.",
  });

  return items;
}

export function sumChecked(items: PlanItem[], checked: Set<string>): Macros {
  return items.reduce<Macros>(
    (acc, it) => {
      if (!checked.has(it.key)) return acc;
      return {
        kcal: acc.kcal + it.macros.kcal,
        protein: acc.protein + it.macros.protein,
        carbs: acc.carbs + it.macros.carbs,
        fat: acc.fat + it.macros.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
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
