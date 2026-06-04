// Achievement-System: viele faire, sinnvolle Erfolge mit Fortschritt und
// Belohnungspunkten. Punkte fließen (moderat) in den Bestenlisten-Score ein.
// Reine, deterministische Logik – alle Werte aus den Trainingsdaten.

export type AchCategory =
  | "consistency"
  | "volume"
  | "effort"
  | "strength"
  | "variety"
  | "nutrition"
  | "special";

export const CATEGORY_LABEL: Record<AchCategory, string> = {
  consistency: "Dranbleiben",
  volume: "Volumen",
  effort: "Fleiß",
  strength: "Stärke",
  variety: "Vielfalt",
  nutrition: "Ernährung",
  special: "Besonderes",
};

// Aggregierte Kennzahlen eines Nutzers (über alle abgeschlossenen Workouts).
export type Stats = {
  workouts: number;
  volume: number; // kg
  sets: number; // harte Sätze (abgehakt)
  reps: number;
  days: number; // verschiedene Trainingstage
  streakDays: number; // längste Serie aufeinanderfolgender Tage
  streakWeeks: number; // längste Serie aufeinanderfolgender Wochen
  exercises: number; // verschiedene Übungen
  best1rm: number; // bestes geschätztes 1RM
  maxWorkoutVolume: number; // größtes Volumen in einer Einheit
  earlyWorkouts: number; // vor 7 Uhr begonnen
  lateWorkouts: number; // nach 21 Uhr begonnen
  weekendWorkouts: number;
  mainGroups: number; // verschiedene Hauptmuskelgruppen (max 6)
  longWorkouts: number; // Einheiten mit >= 20 Arbeitssätzen
  maxSetsWorkout: number; // meiste Arbeitssätze in einer Einheit
  // Ernährung
  loggedDays: number; // Tage mit Ernährungs-Einträgen
  foodEntries: number; // Anzahl protokollierter Lebensmittel/Mahlzeiten
  maxProteinDay: number; // höchstes an einem Tag protokolliertes Protein (g)
  maxWaterMl: number; // höchste an einem Tag protokollierte Wassermenge (ml)
};

export const EMPTY_STATS: Stats = {
  workouts: 0,
  volume: 0,
  sets: 0,
  reps: 0,
  days: 0,
  streakDays: 0,
  streakWeeks: 0,
  exercises: 0,
  best1rm: 0,
  maxWorkoutVolume: 0,
  earlyWorkouts: 0,
  lateWorkouts: 0,
  weekendWorkouts: 0,
  mainGroups: 0,
  longWorkouts: 0,
  maxSetsWorkout: 0,
  loggedDays: 0,
  foodEntries: 0,
  maxProteinDay: 0,
  maxWaterMl: 0,
};

export type Achievement = {
  id: string;
  category: AchCategory;
  title: string;
  desc: string;
  icon: string; // lucide-Name (Mapping im Client)
  points: number;
  goal: number;
  unit?: string;
  value: (s: Stats) => number;
};

const t = 1000;

// Zahl-/Einheiten-Formatierung für generierte Titel & Beschreibungen.
const de = (n: number) => n.toLocaleString("de-DE");
const kg = (g: number) => (g >= t ? `${de(g / t)} t` : `${g} kg`);
const liter = (g: number) => (g >= t ? `${de(g / t)} l` : `${g} ml`);
// Linearer Punkte-Generator: Tier-Index → Belohnungspunkte (moderat gehalten).
const lin = (start: number, step: number) => (i: number) => start + i * step;

// Eine "Familie" gestufter Achievements (z. B. 1/5/10/… Workouts) kompakt
// erzeugen. Stabile ids als `${base}-${goal}` – Löschen/Neu­berechnen ist
// dadurch deterministisch und kollisionsfrei.
type Fam = {
  base: string;
  category: AchCategory;
  icon: string | ((i: number, last: boolean) => string);
  unit?: string;
  value: (s: Stats) => number;
  goals: number[];
  points: (i: number) => number;
  title: (g: number) => string;
  desc: (g: number) => string;
};

function fam(f: Fam): Achievement[] {
  return f.goals.map((goal, i) => ({
    id: `${f.base}-${goal}`,
    category: f.category,
    title: f.title(goal),
    desc: f.desc(goal),
    icon:
      typeof f.icon === "function"
        ? f.icon(i, i === f.goals.length - 1)
        : f.icon,
    points: f.points(i),
    goal,
    unit: f.unit,
    value: f.value,
  }));
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---------- Dranbleiben: Workouts ----------
  ...fam({
    base: "wo",
    category: "consistency",
    icon: (i, last) =>
      i === 0 ? "play" : last ? "crown" : i >= 9 ? "trophy" : "dumbbell",
    unit: "Workouts",
    value: (s) => s.workouts,
    goals: [1, 3, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000],
    points: lin(10, 7),
    title: (g) => (g === 1 ? "Erstes Workout" : `${de(g)} Workouts`),
    desc: (g) =>
      g === 1
        ? "Schließe dein erstes Workout ab."
        : `Schließe ${de(g)} Workouts ab.`,
  }),

  // ---------- Dranbleiben: Trainingstage ----------
  ...fam({
    base: "days",
    category: "consistency",
    icon: (i, last) => (last ? "crown" : i >= 8 ? "trophy" : "calendar"),
    unit: "Tage",
    value: (s) => s.days,
    goals: [5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 365, 500, 730],
    points: lin(12, 8),
    title: (g) => `${de(g)} Trainingstage`,
    desc: (g) => `Trainiere an ${de(g)} verschiedenen Tagen.`,
  }),

  // ---------- Dranbleiben: Tages-Serie ----------
  ...fam({
    base: "streakd",
    category: "consistency",
    icon: "flame",
    unit: "Tage",
    value: (s) => s.streakDays,
    goals: [2, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100],
    points: lin(10, 9),
    title: (g) => `${g} Tage am Stück`,
    desc: (g) => `Trainiere an ${g} Tagen in Folge.`,
  }),

  // ---------- Dranbleiben: Wochen-Serie ----------
  ...fam({
    base: "streakw",
    category: "consistency",
    icon: (i, last) => (last ? "crown" : "calendar"),
    unit: "Wochen",
    value: (s) => s.streakWeeks,
    goals: [2, 4, 6, 8, 12, 16, 26, 40, 52],
    points: lin(20, 18),
    title: (g) => `${g} Wochen-Serie`,
    desc: (g) => `Trainiere ${g} Wochen in Folge mindestens einmal.`,
  }),

  // ---------- Volumen: gesamt ----------
  ...fam({
    base: "vol",
    category: "volume",
    icon: (i, last) => (last ? "crown" : i >= 10 ? "trophy" : "weight"),
    unit: "kg",
    value: (s) => s.volume,
    goals: [
      1 * t, 5 * t, 10 * t, 25 * t, 50 * t, 100 * t, 150 * t, 250 * t, 500 * t,
      750 * t, 1000 * t, 2000 * t, 5000 * t,
    ],
    points: lin(10, 12),
    title: (g) => `${kg(g)} Volumen`,
    desc: (g) => `Bewege insgesamt ${de(g)} kg.`,
  }),

  // ---------- Volumen: einzelne Einheit ----------
  ...fam({
    base: "bigday",
    category: "volume",
    icon: "zap",
    unit: "kg",
    value: (s) => s.maxWorkoutVolume,
    goals: [3000, 5000, 7500, 10000, 12500, 15000, 20000],
    points: lin(20, 12),
    title: (g) => `${kg(g)} an einem Tag`,
    desc: (g) => `Bewege ${de(g)} kg in einer einzigen Einheit.`,
  }),

  // ---------- Fleiß: Sätze ----------
  ...fam({
    base: "sets",
    category: "effort",
    icon: "list",
    unit: "Sätze",
    value: (s) => s.sets,
    goals: [50, 100, 250, 500, 1000, 2500, 5000, 7500, 10000, 20000],
    points: lin(10, 11),
    title: (g) => `${de(g)} Sätze`,
    desc: (g) => `Absolviere ${de(g)} harte Sätze.`,
  }),

  // ---------- Fleiß: Wiederholungen ----------
  ...fam({
    base: "reps",
    category: "effort",
    icon: "repeat",
    unit: "Wdh",
    value: (s) => s.reps,
    goals: [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 200000, 500000],
    points: lin(10, 11),
    title: (g) => `${de(g)} Wiederholungen`,
    desc: (g) => `Sammle insgesamt ${de(g)} Wiederholungen.`,
  }),

  // ---------- Fleiß: Marathon-Einheiten ----------
  ...fam({
    base: "long",
    category: "effort",
    icon: "list",
    unit: "×",
    value: (s) => s.longWorkouts,
    goals: [1, 5, 10, 25, 50],
    points: lin(20, 14),
    title: (g) => (g === 1 ? "Marathon-Einheit" : `${g}× Marathon-Einheit`),
    desc: (g) =>
      `Absolviere ${g} Einheit${g === 1 ? "" : "en"} mit 20+ Arbeitssätzen.`,
  }),

  // ---------- Fleiß: Sätze in einer Einheit ----------
  ...fam({
    base: "maxsets",
    category: "effort",
    icon: "zap",
    unit: "Sätze",
    value: (s) => s.maxSetsWorkout,
    goals: [15, 20, 25, 30, 40],
    points: lin(15, 12),
    title: (g) => `${g} Sätze in einer Einheit`,
    desc: (g) => `Schaffe ${g} Arbeitssätze in einer einzigen Einheit.`,
  }),

  // ---------- Stärke ----------
  ...fam({
    base: "str",
    category: "strength",
    icon: (i, last) => (last ? "crown" : "trending-up"),
    unit: "kg",
    value: (s) => s.best1rm,
    goals: [40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 250, 300],
    points: lin(15, 16),
    title: (g) => `1RM ${g} kg`,
    desc: (g) => `Erreiche ein geschätztes 1RM von ${g} kg.`,
  }),

  // ---------- Vielfalt: Übungen ----------
  ...fam({
    base: "ex",
    category: "variety",
    icon: "shuffle",
    unit: "Übungen",
    value: (s) => s.exercises,
    goals: [3, 5, 10, 20, 30, 50, 75, 100, 150, 200],
    points: lin(10, 12),
    title: (g) => `${de(g)} Übungen`,
    desc: (g) => `Probiere ${de(g)} verschiedene Übungen aus.`,
  }),

  // ---------- Vielfalt: Muskelgruppen ----------
  ...fam({
    base: "groups",
    category: "variety",
    icon: "layers",
    unit: "Gruppen",
    value: (s) => s.mainGroups,
    goals: [3, 6],
    points: lin(20, 25),
    title: (g) => (g >= 6 ? "Ganzkörper" : `${g} Muskelgruppen`),
    desc: (g) =>
      g >= 6
        ? "Trainiere alle 6 Hauptmuskelgruppen."
        : `Trainiere ${g} verschiedene Hauptmuskelgruppen.`,
  }),

  // ---------- Besonderes: früh ----------
  ...fam({
    base: "early",
    category: "special",
    icon: "sunrise",
    unit: "×",
    value: (s) => s.earlyWorkouts,
    goals: [1, 3, 5, 10, 25, 50],
    points: lin(15, 10),
    title: (g) => (g === 1 ? "Frühaufsteher" : `${g}× vor 7 Uhr`),
    desc: (g) => `Starte ${g} Workout${g === 1 ? "" : "s"} vor 7 Uhr morgens.`,
  }),

  // ---------- Besonderes: spät ----------
  ...fam({
    base: "late",
    category: "special",
    icon: "moon",
    unit: "×",
    value: (s) => s.lateWorkouts,
    goals: [1, 3, 5, 10, 25],
    points: lin(15, 10),
    title: (g) => (g === 1 ? "Nachteule" : `${g}× nach 21 Uhr`),
    desc: (g) => `Starte ${g} Workout${g === 1 ? "" : "s"} nach 21 Uhr.`,
  }),

  // ---------- Besonderes: Wochenende ----------
  ...fam({
    base: "weekend",
    category: "special",
    icon: "star",
    unit: "×",
    value: (s) => s.weekendWorkouts,
    goals: [1, 5, 10, 25, 50, 100, 150],
    points: lin(12, 9),
    title: (g) => (g === 1 ? "Wochenend-Start" : `${g}× am Wochenende`),
    desc: (g) => `Absolviere ${g} Workout${g === 1 ? "" : "s"} am Wochenende.`,
  }),

  // ---------- Ernährung: Einträge ----------
  ...fam({
    base: "nutri",
    category: "nutrition",
    icon: "apple",
    unit: "Einträge",
    value: (s) => s.foodEntries,
    goals: [1, 10, 50, 100, 250, 500, 1000, 2500, 5000],
    points: lin(10, 11),
    title: (g) => (g === 1 ? "Erster Eintrag" : `${de(g)} Lebensmittel`),
    desc: (g) =>
      g === 1
        ? "Protokolliere dein erstes Lebensmittel."
        : `Protokolliere ${de(g)} Lebensmittel.`,
  }),

  // ---------- Ernährung: getrackte Tage ----------
  ...fam({
    base: "nutriday",
    category: "nutrition",
    icon: "calendar",
    unit: "Tage",
    value: (s) => s.loggedDays,
    goals: [3, 7, 14, 30, 60, 100, 200, 365],
    points: lin(12, 9),
    title: (g) => `${de(g)} Tage getrackt`,
    desc: (g) => `Protokolliere an ${de(g)} Tagen deine Ernährung.`,
  }),

  // ---------- Ernährung: Protein an einem Tag ----------
  ...fam({
    base: "protein",
    category: "nutrition",
    icon: "beef",
    unit: "g",
    value: (s) => s.maxProteinDay,
    goals: [100, 125, 150, 175, 200, 250, 300, 350],
    points: lin(15, 8),
    title: (g) => `${g} g Protein`,
    desc: (g) => `Protokolliere ${g} g Protein an einem Tag.`,
  }),

  // ---------- Ernährung: Wasser an einem Tag ----------
  ...fam({
    base: "water",
    category: "nutrition",
    icon: "droplet",
    unit: "ml",
    value: (s) => s.maxWaterMl,
    goals: [2000, 2500, 3000, 3500, 4000, 5000],
    points: lin(12, 7),
    title: (g) => `${liter(g)} Wasser`,
    desc: (g) => `Tracke ${liter(g)} Wasser an einem Tag.`,
  }),
];

export type AchProgress = {
  def: Achievement;
  value: number;
  progress: number; // 0..1
  earned: boolean;
};

export function evaluateAchievements(s: Stats): AchProgress[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value(s);
    const progress = def.goal > 0 ? Math.min(1, value / def.goal) : 0;
    return { def, value, progress, earned: value >= def.goal };
  });
}

export function achievementPoints(s: Stats): number {
  return ACHIEVEMENTS.reduce(
    (sum, def) => sum + (def.value(s) >= def.goal ? def.points : 0),
    0,
  );
}

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;
export const TOTAL_POINTS = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);

/* ---------------- Stats aus Workouts ---------------- */

type SetLite = {
  weight: number;
  reps: number;
  isCompleted: boolean;
  setType: string;
};
type WorkoutLite = {
  startedAt: Date;
  exercises: { exerciseId: string; muscleSlug: string; sets: SetLite[] }[];
};

const MAIN_GROUP: Record<string, string> = {
  chest: "chest",
  back: "back",
  lats: "back",
  traps: "back",
  lowerback: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  abs: "core",
  obliques: "core",
};

function epley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
}

function isoWeekKey(d: Date): string {
  // Donnerstag-Trick für ISO-Woche.
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+x - +yearStart) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${week}`;
}
export function statsFromWorkouts(workouts: WorkoutLite[]): Stats {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  let best1rm = 0;
  let maxWorkoutVolume = 0;
  let early = 0;
  let late = 0;
  let weekend = 0;
  let longWorkouts = 0;
  let maxSetsWorkout = 0;
  const dayMs = new Set<number>();
  const weekKeys = new Set<string>();
  const exIds = new Set<string>();
  const groups = new Set<string>();

  for (const w of workouts) {
    let wVol = 0;
    let wSets = 0;
    const h = w.startedAt.getHours();
    if (h < 7) early++;
    if (h >= 21) late++;
    const wd = w.startedAt.getDay();
    if (wd === 0 || wd === 6) weekend++;
    const d = new Date(
      w.startedAt.getFullYear(),
      w.startedAt.getMonth(),
      w.startedAt.getDate(),
    );
    dayMs.add(d.getTime());
    weekKeys.add(isoWeekKey(w.startedAt));
    for (const e of w.exercises) {
      exIds.add(e.exerciseId);
      const g = MAIN_GROUP[e.muscleSlug];
      if (g) groups.add(g);
      for (const s of e.sets) {
        if (!s.isCompleted || s.setType === "warmup") continue;
        sets++;
        wSets++;
        reps += s.reps;
        const v = s.weight * s.reps;
        volume += v;
        wVol += v;
        const e1 = epley(s.weight, s.reps);
        if (e1 > best1rm) best1rm = e1;
      }
    }
    if (wVol > maxWorkoutVolume) maxWorkoutVolume = wVol;
    if (wSets > maxSetsWorkout) maxSetsWorkout = wSets;
    if (wSets >= 20) longWorkouts++;
  }

  // Längste Serien.
  const sortedDays = [...dayMs].sort((a, b) => a - b);
  let streakDays = sortedDays.length ? 1 : 0;
  let run = streakDays;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] - sortedDays[i - 1] === 86400000) run++;
    else run = 1;
    if (run > streakDays) streakDays = run;
  }

  const sortedWeeks = [...weekKeys].sort();
  let streakWeeks = sortedWeeks.length ? 1 : 0;
  let wrun = streakWeeks;
  const weekNum = (k: string) => {
    const [y, w] = k.split("-W");
    return parseInt(y) * 53 + parseInt(w);
  };
  for (let i = 1; i < sortedWeeks.length; i++) {
    if (weekNum(sortedWeeks[i]) - weekNum(sortedWeeks[i - 1]) === 1) wrun++;
    else wrun = 1;
    if (wrun > streakWeeks) streakWeeks = wrun;
  }

  return {
    workouts: workouts.length,
    volume,
    sets,
    reps,
    days: dayMs.size,
    streakDays,
    streakWeeks,
    exercises: exIds.size,
    best1rm,
    maxWorkoutVolume,
    earlyWorkouts: early,
    lateWorkouts: late,
    weekendWorkouts: weekend,
    mainGroups: groups.size,
    longWorkouts,
    maxSetsWorkout,
    loggedDays: 0,
    foodEntries: 0,
    maxProteinDay: 0,
    maxWaterMl: 0,
  };
}

/* ---------------- Ernährungs-Stats ---------------- */

export type NutritionInput = {
  // Pro protokolliertem Lebensmittel: Tag + Protein (für Tages-Maxima).
  entries: { date: string; protein: number }[];
  // Wasser je Tag (ml).
  waterByDay: number[];
};

// Ernährungs-Kennzahlen in die Stats mergen (für Ernährungs-Achievements).
export function addNutrition(stats: Stats, n: NutritionInput): Stats {
  const days = new Set<string>();
  const proteinByDay = new Map<string, number>();
  for (const e of n.entries) {
    days.add(e.date);
    proteinByDay.set(e.date, (proteinByDay.get(e.date) ?? 0) + e.protein);
  }
  return {
    ...stats,
    loggedDays: days.size,
    foodEntries: n.entries.length,
    maxProteinDay: Math.max(0, ...proteinByDay.values(), 0),
    maxWaterMl: Math.max(0, ...n.waterByDay, 0),
  };
}
