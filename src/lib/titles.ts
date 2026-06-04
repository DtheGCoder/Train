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
];

export type TitleProgress = { title: Title; unlocked: boolean };

export function evaluateTitles(ctx: TitleCtx): TitleProgress[] {
  return TITLES.map((title) => ({ title, unlocked: title.unlock(ctx) }));
}

export function titleById(id: string): Title | undefined {
  return TITLES.find((t) => t.id === id);
}

export const TOTAL_TITLES = TITLES.length;
