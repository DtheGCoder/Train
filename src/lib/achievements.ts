// Achievement-System: viele faire, sinnvolle Erfolge mit Fortschritt und
// Belohnungspunkten. Punkte fließen (moderat) in den Bestenlisten-Score ein.
// Reine, deterministische Logik – alle Werte aus den Trainingsdaten.

export type AchCategory =
  | "consistency"
  | "volume"
  | "effort"
  | "strength"
  | "variety"
  | "special";

export const CATEGORY_LABEL: Record<AchCategory, string> = {
  consistency: "Dranbleiben",
  volume: "Volumen",
  effort: "Fleiß",
  strength: "Stärke",
  variety: "Vielfalt",
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

export const ACHIEVEMENTS: Achievement[] = [
  // ---------- Dranbleiben ----------
  { id: "first", category: "consistency", title: "Aller Anfang", desc: "Schließe dein erstes Workout ab.", icon: "play", points: 10, goal: 1, unit: "Workouts", value: (s) => s.workouts },
  { id: "wo10", category: "consistency", title: "Warmgelaufen", desc: "10 Workouts abgeschlossen.", icon: "dumbbell", points: 20, goal: 10, unit: "Workouts", value: (s) => s.workouts },
  { id: "wo25", category: "consistency", title: "Routine drin", desc: "25 Workouts abgeschlossen.", icon: "dumbbell", points: 40, goal: 25, unit: "Workouts", value: (s) => s.workouts },
  { id: "wo50", category: "consistency", title: "Eiserner Wille", desc: "50 Workouts abgeschlossen.", icon: "dumbbell", points: 70, goal: 50, unit: "Workouts", value: (s) => s.workouts },
  { id: "wo100", category: "consistency", title: "Hundert!", desc: "100 Workouts abgeschlossen.", icon: "trophy", points: 120, goal: 100, unit: "Workouts", value: (s) => s.workouts },
  { id: "wo250", category: "consistency", title: "Legende", desc: "250 Workouts abgeschlossen.", icon: "crown", points: 200, goal: 250, unit: "Workouts", value: (s) => s.workouts },
  { id: "streak3", category: "consistency", title: "Drei am Stück", desc: "An 3 Tagen in Folge trainiert.", icon: "flame", points: 15, goal: 3, unit: "Tage", value: (s) => s.streakDays },
  { id: "streak7", category: "consistency", title: "Ganze Woche", desc: "An 7 Tagen in Folge trainiert.", icon: "flame", points: 40, goal: 7, unit: "Tage", value: (s) => s.streakDays },
  { id: "weeks4", category: "consistency", title: "Monat durchgezogen", desc: "4 Wochen in Folge mindestens 1 Einheit.", icon: "calendar", points: 50, goal: 4, unit: "Wochen", value: (s) => s.streakWeeks },
  { id: "weeks12", category: "consistency", title: "Dauerbrenner", desc: "12 Wochen in Folge trainiert.", icon: "calendar", points: 110, goal: 12, unit: "Wochen", value: (s) => s.streakWeeks },
  { id: "days30", category: "consistency", title: "30 Trainingstage", desc: "An 30 verschiedenen Tagen trainiert.", icon: "calendar", points: 30, goal: 30, unit: "Tage", value: (s) => s.days },
  { id: "days100", category: "consistency", title: "100 Trainingstage", desc: "An 100 verschiedenen Tagen trainiert.", icon: "calendar", points: 90, goal: 100, unit: "Tage", value: (s) => s.days },

  // ---------- Volumen ----------
  { id: "vol1", category: "volume", title: "Erste Tonne", desc: "1.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 10, goal: 1 * t, unit: "kg", value: (s) => s.volume },
  { id: "vol10", category: "volume", title: "10 Tonnen", desc: "10.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 25, goal: 10 * t, unit: "kg", value: (s) => s.volume },
  { id: "vol50", category: "volume", title: "50 Tonnen", desc: "50.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 60, goal: 50 * t, unit: "kg", value: (s) => s.volume },
  { id: "vol100", category: "volume", title: "100 Tonnen", desc: "100.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 100, goal: 100 * t, unit: "kg", value: (s) => s.volume },
  { id: "vol250", category: "volume", title: "Viertelmillion", desc: "250.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 160, goal: 250 * t, unit: "kg", value: (s) => s.volume },
  { id: "vol500", category: "volume", title: "Halbe Million", desc: "500.000 kg Gesamtvolumen bewegt.", icon: "weight", points: 220, goal: 500 * t, unit: "kg", value: (s) => s.volume },
  { id: "bigday5", category: "volume", title: "Großer Tag", desc: "5.000 kg in einer einzigen Einheit.", icon: "zap", points: 30, goal: 5 * t, unit: "kg", value: (s) => s.maxWorkoutVolume },
  { id: "bigday10", category: "volume", title: "Monster-Session", desc: "10.000 kg in einer einzigen Einheit.", icon: "zap", points: 60, goal: 10 * t, unit: "kg", value: (s) => s.maxWorkoutVolume },

  // ---------- Fleiß ----------
  { id: "sets100", category: "effort", title: "100 Sätze", desc: "100 harte Sätze absolviert.", icon: "list", points: 15, goal: 100, unit: "Sätze", value: (s) => s.sets },
  { id: "sets1000", category: "effort", title: "1.000 Sätze", desc: "1.000 harte Sätze absolviert.", icon: "list", points: 50, goal: 1000, unit: "Sätze", value: (s) => s.sets },
  { id: "sets5000", category: "effort", title: "5.000 Sätze", desc: "5.000 harte Sätze absolviert.", icon: "list", points: 120, goal: 5000, unit: "Sätze", value: (s) => s.sets },
  { id: "reps1000", category: "effort", title: "1.000 Wiederholungen", desc: "Insgesamt 1.000 Wiederholungen.", icon: "repeat", points: 15, goal: 1000, unit: "Wdh", value: (s) => s.reps },
  { id: "reps10000", category: "effort", title: "10.000 Wiederholungen", desc: "Insgesamt 10.000 Wiederholungen.", icon: "repeat", points: 60, goal: 10000, unit: "Wdh", value: (s) => s.reps },
  { id: "reps50000", category: "effort", title: "50.000 Wiederholungen", desc: "Insgesamt 50.000 Wiederholungen.", icon: "repeat", points: 140, goal: 50000, unit: "Wdh", value: (s) => s.reps },

  // ---------- Stärke ----------
  { id: "str60", category: "strength", title: "Solide Basis", desc: "Geschätztes 1RM von 60 kg erreicht.", icon: "trending-up", points: 20, goal: 60, unit: "kg", value: (s) => s.best1rm },
  { id: "str100", category: "strength", title: "Dreistellig", desc: "Geschätztes 1RM von 100 kg erreicht.", icon: "trending-up", points: 55, goal: 100, unit: "kg", value: (s) => s.best1rm },
  { id: "str140", category: "strength", title: "Schwergewicht", desc: "Geschätztes 1RM von 140 kg erreicht.", icon: "trending-up", points: 95, goal: 140, unit: "kg", value: (s) => s.best1rm },
  { id: "str180", category: "strength", title: "Kraftpaket", desc: "Geschätztes 1RM von 180 kg erreicht.", icon: "trending-up", points: 150, goal: 180, unit: "kg", value: (s) => s.best1rm },

  // ---------- Vielfalt ----------
  { id: "ex5", category: "variety", title: "Neugierig", desc: "5 verschiedene Übungen ausprobiert.", icon: "shuffle", points: 10, goal: 5, unit: "Übungen", value: (s) => s.exercises },
  { id: "ex20", category: "variety", title: "Abwechslung", desc: "20 verschiedene Übungen ausprobiert.", icon: "shuffle", points: 30, goal: 20, unit: "Übungen", value: (s) => s.exercises },
  { id: "ex50", category: "variety", title: "Übungs-Sammler", desc: "50 verschiedene Übungen ausprobiert.", icon: "shuffle", points: 70, goal: 50, unit: "Übungen", value: (s) => s.exercises },
  { id: "allgroups", category: "variety", title: "Ganzkörper", desc: "Alle 6 Hauptmuskelgruppen trainiert.", icon: "layers", points: 40, goal: 6, unit: "Gruppen", value: (s) => s.mainGroups },

  // ---------- Besonderes ----------
  { id: "early1", category: "special", title: "Frühaufsteher", desc: "Ein Workout vor 7 Uhr gestartet.", icon: "sunrise", points: 20, goal: 1, unit: "×", value: (s) => s.earlyWorkouts },
  { id: "early5", category: "special", title: "Morgenmensch", desc: "5 Workouts vor 7 Uhr gestartet.", icon: "sunrise", points: 45, goal: 5, unit: "×", value: (s) => s.earlyWorkouts },
  { id: "late1", category: "special", title: "Nachteule", desc: "Ein Workout nach 21 Uhr gestartet.", icon: "moon", points: 20, goal: 1, unit: "×", value: (s) => s.lateWorkouts },
  { id: "weekend10", category: "special", title: "Wochenend-Krieger", desc: "10 Workouts am Wochenende.", icon: "star", points: 35, goal: 10, unit: "×", value: (s) => s.weekendWorkouts },
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
  const dayMs = new Set<number>();
  const weekKeys = new Set<string>();
  const exIds = new Set<string>();
  const groups = new Set<string>();

  for (const w of workouts) {
    let wVol = 0;
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
        reps += s.reps;
        const v = s.weight * s.reps;
        volume += v;
        wVol += v;
        const e1 = epley(s.weight, s.reps);
        if (e1 > best1rm) best1rm = e1;
      }
    }
    if (wVol > maxWorkoutVolume) maxWorkoutVolume = wVol;
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
  };
}
