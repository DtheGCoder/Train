// Titel-System: besondere Erfolge schalten Titel frei, die man im Profil oder
// im Titel-Tab ausrüsten kann. Der ausgerüstete Titel erscheint in der
// Bestenliste unter dem Namen – je nach Seltenheit farbig & animiert.
// Reine Logik; Bedingungen werden aus den Trainings-/Ernährungs-Stats abgeleitet.

import type { Stats } from "./achievements";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "funny"
  | "secret";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  epic: "Episch",
  legendary: "Legendär",
  funny: "Spaß",
  secret: "Geheim",
};

// Reihenfolge für Sortierung/Gruppierung (selten/episch zuerst spannender).
export const RARITY_ORDER: Rarity[] = [
  "legendary",
  "secret",
  "epic",
  "rare",
  "funny",
  "uncommon",
  "common",
];

export type TitleCtx = { stats: Stats; earnedCount: number };

export type Title = {
  id: string;
  name: string;
  rarity: Rarity;
  // Sichtbare Bedingung. Bei hidden=true wird sie erst nach dem Freischalten gezeigt.
  condition: string;
  hidden?: boolean;
  unlock: (c: TitleCtx) => boolean;
};

export const TITLES: Title[] = [
  // ---------- Gewöhnlich (leicht) ----------
  { id: "t-newbie", name: "Frischling", rarity: "common", condition: "Schließe dein erstes Workout ab.", unlock: (c) => c.stats.workouts >= 1 },
  { id: "t-regular", name: "Stammgast", rarity: "common", condition: "10 Workouts abschließen.", unlock: (c) => c.stats.workouts >= 10 },
  { id: "t-lifter", name: "Eisenfreund", rarity: "common", condition: "25 Workouts abschließen.", unlock: (c) => c.stats.workouts >= 25 },
  { id: "t-tracker", name: "Notizbuch", rarity: "common", condition: "Erstes Lebensmittel protokollieren.", unlock: (c) => c.stats.foodEntries >= 1 },

  // ---------- Ungewöhnlich ----------
  { id: "t-toncollector", name: "Tonnenjäger", rarity: "uncommon", condition: "50.000 kg Gesamtvolumen bewegen.", unlock: (c) => c.stats.volume >= 50000 },
  { id: "t-earlybird", name: "Frühaufsteher", rarity: "uncommon", condition: "5 Workouts vor 7 Uhr.", unlock: (c) => c.stats.earlyWorkouts >= 5 },
  { id: "t-proteinfan", name: "Protein-Fan", rarity: "uncommon", condition: "An einem Tag 150 g Protein tracken.", unlock: (c) => c.stats.maxProteinDay >= 150 },
  { id: "t-streak7", name: "Wochenstreber", rarity: "uncommon", condition: "7 Tage in Folge trainieren.", unlock: (c) => c.stats.streakDays >= 7 },

  // ---------- Selten ----------
  { id: "t-century", name: "Hundertschaft", rarity: "rare", condition: "100 Workouts abschließen.", unlock: (c) => c.stats.workouts >= 100 },
  { id: "t-volbeast", name: "Volumen-Tier", rarity: "rare", condition: "250.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 250000 },
  { id: "t-allround", name: "Allrounder", rarity: "rare", condition: "Alle 6 Hauptmuskelgruppen trainieren.", unlock: (c) => c.stats.mainGroups >= 6 },
  { id: "t-collector", name: "Sammler", rarity: "rare", condition: "50 verschiedene Übungen.", unlock: (c) => c.stats.exercises >= 50 },

  // ---------- Episch ----------
  { id: "t-powerhouse", name: "Kraftpaket", rarity: "epic", condition: "Geschätztes 1RM von 140 kg.", unlock: (c) => c.stats.best1rm >= 140 },
  { id: "t-unstoppable", name: "Unaufhaltsam", rarity: "epic", condition: "12 Wochen in Folge trainieren.", unlock: (c) => c.stats.streakWeeks >= 12 },
  { id: "t-disciplined", name: "Eiserne Disziplin", rarity: "epic", condition: "An 100 Tagen trainieren.", unlock: (c) => c.stats.days >= 100 },

  // ---------- Legendär (sehr schwer) ----------
  { id: "t-legend", name: "Legende", rarity: "legendary", condition: "250 Workouts abschließen.", unlock: (c) => c.stats.workouts >= 250 },
  { id: "t-titan", name: "Titan", rarity: "legendary", condition: "Geschätztes 1RM von 220 kg.", unlock: (c) => c.stats.best1rm >= 220 },
  { id: "t-millionaire", name: "Tonnen-Millionär", rarity: "legendary", condition: "1.000.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 1000000 },
  { id: "t-completionist", name: "Der Vollender", rarity: "legendary", condition: "30 Achievements freischalten.", unlock: (c) => c.earnedCount >= 30 },

  // ---------- Spaß ----------
  { id: "t-sofa", name: "Sofa-Athlet", rarity: "funny", condition: "Starte überhaupt mal ein Workout.", unlock: (c) => c.stats.workouts >= 1 },
  { id: "t-sweatbox", name: "Schwitzkasten", rarity: "funny", condition: "Eine Einheit mit 20+ Sätzen überleben.", unlock: (c) => c.stats.longWorkouts >= 1 },
  { id: "t-broccoli", name: "Brokkoli-Boss", rarity: "funny", condition: "100 Lebensmittel tracken (auch das Gemüse).", unlock: (c) => c.stats.foodEntries >= 100 },
  { id: "t-waterfall", name: "Wasserfall-Willi", rarity: "funny", condition: "4 Liter Wasser an einem Tag.", unlock: (c) => c.stats.maxWaterMl >= 4000 },
  { id: "t-nightowl", name: "Mitternachts-Gremlin", rarity: "funny", condition: "10 Workouts nach 21 Uhr.", unlock: (c) => c.stats.lateWorkouts >= 10 },
  { id: "t-weekendwar", name: "Wochenend-Berserker", rarity: "funny", condition: "30 Workouts am Wochenende.", unlock: (c) => c.stats.weekendWorkouts >= 30 },

  // ---------- Geheim (Bedingung versteckt) ----------
  { id: "s-ghost", name: "Geist der Maschine", rarity: "secret", hidden: true, condition: "Trainiere sowohl vor 7 Uhr als auch nach 21 Uhr.", unlock: (c) => c.stats.earlyWorkouts >= 1 && c.stats.lateWorkouts >= 1 },
  { id: "s-machine", name: "Die Maschine", rarity: "secret", hidden: true, condition: "1.000 harte Sätze + 100 Trainingstage.", unlock: (c) => c.stats.sets >= 1000 && c.stats.days >= 100 },
  { id: "s-quark", name: "Quark-Connaisseur", rarity: "secret", hidden: true, condition: "200 g Protein an einem Tag.", unlock: (c) => c.stats.maxProteinDay >= 200 },
  { id: "s-chosen", name: "Der Auserwählte", rarity: "secret", hidden: true, condition: "Schalte fast alles frei (40 Achievements).", unlock: (c) => c.earnedCount >= 40 },
  { id: "s-marathon", name: "Eisenmarathon", rarity: "secret", hidden: true, condition: "26 Wochen Streak am Stück.", unlock: (c) => c.stats.streakWeeks >= 26 },

  // ===================== Erweiterung =====================
  // ---------- Gewöhnlich ----------
  { id: "t-warmup", name: "Aufgewärmt", rarity: "common", condition: "5 Workouts abschließen.", unlock: (c) => c.stats.workouts >= 5 },
  { id: "t-firstkg", name: "Erste Kilos", rarity: "common", condition: "1.000 kg Gesamtvolumen bewegen.", unlock: (c) => c.stats.volume >= 1000 },
  { id: "t-firstsets", name: "Satz für Satz", rarity: "common", condition: "50 harte Sätze absolvieren.", unlock: (c) => c.stats.sets >= 50 },
  { id: "t-firsttrack", name: "Zettelwirtschaft", rarity: "common", condition: "10 Lebensmittel protokollieren.", unlock: (c) => c.stats.foodEntries >= 10 },
  { id: "t-sip", name: "Schluckspecht", rarity: "common", condition: "2 Liter Wasser an einem Tag tracken.", unlock: (c) => c.stats.maxWaterMl >= 2000 },
  { id: "t-curious", name: "Schnupperer", rarity: "common", condition: "10 verschiedene Übungen ausprobieren.", unlock: (c) => c.stats.exercises >= 10 },

  // ---------- Ungewöhnlich ----------
  { id: "t-vol10", name: "Zehn Tonnen", rarity: "uncommon", condition: "10.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 10000 },
  { id: "t-setsmid", name: "Satz-Sammler", rarity: "uncommon", condition: "250 harte Sätze.", unlock: (c) => c.stats.sets >= 250 },
  { id: "t-reps5k", name: "Wiederholungstäter", rarity: "uncommon", condition: "5.000 Wiederholungen.", unlock: (c) => c.stats.reps >= 5000 },
  { id: "t-days50", name: "50 Tage", rarity: "uncommon", condition: "An 50 Tagen trainieren.", unlock: (c) => c.stats.days >= 50 },
  { id: "t-streak14", name: "Zwei-Wochen-Streak", rarity: "uncommon", condition: "14 Tage in Folge trainieren.", unlock: (c) => c.stats.streakDays >= 14 },
  { id: "t-ex25", name: "Abwechslungsreich", rarity: "uncommon", condition: "25 verschiedene Übungen.", unlock: (c) => c.stats.exercises >= 25 },
  { id: "t-weekend5", name: "Wochenend-Starter", rarity: "uncommon", condition: "5 Workouts am Wochenende.", unlock: (c) => c.stats.weekendWorkouts >= 5 },
  { id: "t-strong80", name: "Solide stark", rarity: "uncommon", condition: "Geschätztes 1RM von 80 kg.", unlock: (c) => c.stats.best1rm >= 80 },
  { id: "t-water3", name: "Wasserkanne", rarity: "uncommon", condition: "3 Liter Wasser an einem Tag.", unlock: (c) => c.stats.maxWaterMl >= 3000 },
  { id: "t-ach10", name: "Sammler-Lehrling", rarity: "uncommon", condition: "10 Achievements freischalten.", unlock: (c) => c.earnedCount >= 10 },

  // ---------- Selten ----------
  { id: "t-vol100", name: "Hundert Tonnen", rarity: "rare", condition: "100.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 100000 },
  { id: "t-days200", name: "200 Trainingstage", rarity: "rare", condition: "An 200 Tagen trainieren.", unlock: (c) => c.stats.days >= 200 },
  { id: "t-streak30", name: "Monats-Krieger", rarity: "rare", condition: "30 Tage in Folge trainieren.", unlock: (c) => c.stats.streakDays >= 30 },
  { id: "t-strong120", name: "Schwer unterwegs", rarity: "rare", condition: "Geschätztes 1RM von 120 kg.", unlock: (c) => c.stats.best1rm >= 120 },
  { id: "t-reps25k", name: "Repetier-Profi", rarity: "rare", condition: "25.000 Wiederholungen.", unlock: (c) => c.stats.reps >= 25000 },
  { id: "t-sets2500", name: "Satz-Veteran", rarity: "rare", condition: "2.500 harte Sätze.", unlock: (c) => c.stats.sets >= 2500 },
  { id: "t-track90", name: "Tracking-Veteran", rarity: "rare", condition: "An 90 Tagen Ernährung tracken.", unlock: (c) => c.stats.loggedDays >= 90 },
  { id: "t-ach20", name: "Sammler-Geist", rarity: "rare", condition: "20 Achievements freischalten.", unlock: (c) => c.earnedCount >= 20 },
  { id: "t-bigday10", name: "Zehn-Tonnen-Tag", rarity: "rare", condition: "10.000 kg in einer Einheit.", unlock: (c) => c.stats.maxWorkoutVolume >= 10000 },
  { id: "t-weeks8", name: "Acht-Wochen-Lauf", rarity: "rare", condition: "8 Wochen in Folge trainieren.", unlock: (c) => c.stats.streakWeeks >= 8 },

  // ---------- Episch ----------
  { id: "t-vol500", name: "Halbe Million (kg)", rarity: "epic", condition: "500.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 500000 },
  { id: "t-sets5k", name: "Satz-Magier", rarity: "epic", condition: "5.000 harte Sätze.", unlock: (c) => c.stats.sets >= 5000 },
  { id: "t-reps100k", name: "Wiederholungs-Wahnsinn", rarity: "epic", condition: "100.000 Wiederholungen.", unlock: (c) => c.stats.reps >= 100000 },
  { id: "t-days365", name: "Ein Jahr dabei", rarity: "epic", condition: "An 365 Tagen trainieren.", unlock: (c) => c.stats.days >= 365 },
  { id: "t-streak50", name: "50 Tage am Stück", rarity: "epic", condition: "50 Tage in Folge trainieren.", unlock: (c) => c.stats.streakDays >= 50 },
  { id: "t-strong160", name: "Schwergewicht", rarity: "epic", condition: "Geschätztes 1RM von 160 kg.", unlock: (c) => c.stats.best1rm >= 160 },
  { id: "t-bigday15", name: "15-Tonnen-Tag", rarity: "epic", condition: "15.000 kg in einer Einheit.", unlock: (c) => c.stats.maxWorkoutVolume >= 15000 },
  { id: "t-ach40", name: "Beinahe komplett", rarity: "epic", condition: "40 Achievements freischalten.", unlock: (c) => c.earnedCount >= 40 },

  // ---------- Legendär ----------
  { id: "t-vol2m", name: "Zwei Millionen", rarity: "legendary", condition: "2.000.000 kg Gesamtvolumen.", unlock: (c) => c.stats.volume >= 2000000 },
  { id: "t-days500", name: "500 Tage Eisen", rarity: "legendary", condition: "An 500 Tagen trainieren.", unlock: (c) => c.stats.days >= 500 },
  { id: "t-streak100", name: "Hundert-Tage-Streak", rarity: "legendary", condition: "100 Tage in Folge trainieren.", unlock: (c) => c.stats.streakDays >= 100 },
  { id: "t-weeks52", name: "Ein Jahr ohne Pause", rarity: "legendary", condition: "52 Wochen in Folge trainieren.", unlock: (c) => c.stats.streakWeeks >= 52 },
  { id: "t-strong250", name: "Übermensch", rarity: "legendary", condition: "Geschätztes 1RM von 250 kg.", unlock: (c) => c.stats.best1rm >= 250 },
  { id: "t-bigday20", name: "Tonnen-Monster", rarity: "legendary", condition: "20.000 kg in einer Einheit.", unlock: (c) => c.stats.maxWorkoutVolume >= 20000 },
  { id: "t-ach50", name: "Allwissend", rarity: "legendary", condition: "50 Achievements freischalten.", unlock: (c) => c.earnedCount >= 50 },

  // ---------- Spaß ----------
  { id: "t-coffee", name: "Erst Kaffee, dann Eisen", rarity: "funny", condition: "Ein Workout vor 7 Uhr.", unlock: (c) => c.stats.earlyWorkouts >= 1 },
  { id: "t-snackboss", name: "Snack-Beauftragter", rarity: "funny", condition: "50 Lebensmittel tracken.", unlock: (c) => c.stats.foodEntries >= 50 },
  { id: "t-couch", name: "Couch-Veteran", rarity: "funny", condition: "50 Workouts (von der Couch hoch!).", unlock: (c) => c.stats.workouts >= 50 },
  { id: "t-gymrat", name: "Gym-Ratte", rarity: "funny", condition: "An 100 Tagen im Studio.", unlock: (c) => c.stats.days >= 100 },
  { id: "t-onemore", name: "Noch ein Satz!", rarity: "funny", condition: "30 Arbeitssätze in einer Einheit.", unlock: (c) => c.stats.maxSetsWorkout >= 30 },
  { id: "t-closing", name: "Studio schließt gleich", rarity: "funny", condition: "40 Arbeitssätze in einer Einheit.", unlock: (c) => c.stats.maxSetsWorkout >= 40 },
  { id: "t-nosleep", name: "Wer braucht Schlaf?", rarity: "funny", condition: "25 Workouts nach 21 Uhr.", unlock: (c) => c.stats.lateWorkouts >= 25 },
  { id: "t-mealprep", name: "Meal-Prep-Messias", rarity: "funny", condition: "An 30 Tagen Ernährung tracken.", unlock: (c) => c.stats.loggedDays >= 30 },
  { id: "t-toilet", name: "Toiletten-Stammgast", rarity: "funny", condition: "4 Liter Wasser an einem Tag.", unlock: (c) => c.stats.maxWaterMl >= 4000 },
  { id: "t-sunday", name: "Sonntags-Held", rarity: "funny", condition: "10 Workouts am Wochenende.", unlock: (c) => c.stats.weekendWorkouts >= 10 },
  { id: "t-puddle", name: "Pfützenmacher", rarity: "funny", condition: "10 Mammut-Einheiten (20+ Sätze).", unlock: (c) => c.stats.longWorkouts >= 10 },
  { id: "t-curls", name: "Curls für die Girls", rarity: "funny", condition: "20 verschiedene Übungen.", unlock: (c) => c.stats.exercises >= 20 },
  { id: "t-quarkdestroyer", name: "Quark-Vernichter", rarity: "funny", condition: "150 g Protein an einem Tag.", unlock: (c) => c.stats.maxProteinDay >= 150 },

  // ---------- Geheim ----------
  { id: "s-yinyang", name: "Yin & Yang", rarity: "secret", hidden: true, condition: "Je 5 Workouts vor 7 und nach 21 Uhr.", unlock: (c) => c.stats.earlyWorkouts >= 5 && c.stats.lateWorkouts >= 5 },
  { id: "s-grinder", name: "Der Schleifer", rarity: "secret", hidden: true, condition: "2.500 Sätze + 200 Trainingstage.", unlock: (c) => c.stats.sets >= 2500 && c.stats.days >= 200 },
  { id: "s-ironwill", name: "Wille aus Stahl", rarity: "secret", hidden: true, condition: "30-Tage-Streak + 100.000 kg Volumen.", unlock: (c) => c.stats.streakDays >= 30 && c.stats.volume >= 100000 },
  { id: "s-omnivore", name: "Allesfresser", rarity: "secret", hidden: true, condition: "500 Einträge + 200 g Protein-Tag.", unlock: (c) => c.stats.foodEntries >= 500 && c.stats.maxProteinDay >= 200 },
  { id: "s-monk", name: "Der Asket", rarity: "secret", hidden: true, condition: "90 Tracking-Tage + 100 Trainingstage.", unlock: (c) => c.stats.loggedDays >= 90 && c.stats.days >= 100 },
  { id: "s-beast", name: "Die Bestie", rarity: "secret", hidden: true, condition: "1RM 200 kg + 500.000 kg Volumen.", unlock: (c) => c.stats.best1rm >= 200 && c.stats.volume >= 500000 },
  { id: "s-nolife", name: "Kein Privatleben", rarity: "secret", hidden: true, condition: "200 Trainingstage + 30 Wochenend-Workouts.", unlock: (c) => c.stats.days >= 200 && c.stats.weekendWorkouts >= 30 },
];

export type TitleProgress = { title: Title; unlocked: boolean };

export function evaluateTitles(ctx: TitleCtx): TitleProgress[] {
  return TITLES.map((title) => ({ title, unlocked: title.unlock(ctx) }));
}

export function titleById(id: string): Title | undefined {
  return TITLES.find((t) => t.id === id);
}

export const TOTAL_TITLES = TITLES.length;
