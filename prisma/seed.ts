import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

const muscleGroups = [
  { slug: "chest", nameDe: "Brust", nameEn: "Chest", bodyRegion: "Oberkörper" },
  { slug: "back", nameDe: "Rücken", nameEn: "Back", bodyRegion: "Oberkörper" },
  { slug: "lats", nameDe: "Latissimus", nameEn: "Lats", bodyRegion: "Oberkörper" },
  { slug: "traps", nameDe: "Trapez", nameEn: "Traps", bodyRegion: "Oberkörper" },
  { slug: "shoulders", nameDe: "Schultern", nameEn: "Shoulders", bodyRegion: "Oberkörper" },
  { slug: "biceps", nameDe: "Bizeps", nameEn: "Biceps", bodyRegion: "Oberkörper" },
  { slug: "triceps", nameDe: "Trizeps", nameEn: "Triceps", bodyRegion: "Oberkörper" },
  { slug: "forearms", nameDe: "Unterarme", nameEn: "Forearms", bodyRegion: "Oberkörper" },
  { slug: "quads", nameDe: "Quadrizeps", nameEn: "Quadriceps", bodyRegion: "Unterkörper" },
  { slug: "hamstrings", nameDe: "Beinbeuger", nameEn: "Hamstrings", bodyRegion: "Unterkörper" },
  { slug: "glutes", nameDe: "Gesäß", nameEn: "Glutes", bodyRegion: "Unterkörper" },
  { slug: "calves", nameDe: "Waden", nameEn: "Calves", bodyRegion: "Unterkörper" },
  { slug: "abs", nameDe: "Bauch", nameEn: "Abs", bodyRegion: "Rumpf" },
  { slug: "obliques", nameDe: "Seitliche Bauchmuskeln", nameEn: "Obliques", bodyRegion: "Rumpf" },
  { slug: "lowerback", nameDe: "Unterer Rücken", nameEn: "Lower Back", bodyRegion: "Rumpf" },
  { slug: "fullbody", nameDe: "Ganzkörper", nameEn: "Full Body", bodyRegion: "Ganzkörper" },
  { slug: "cardio", nameDe: "Cardio", nameEn: "Cardio", bodyRegion: "Ganzkörper" },
];

const equipment = [
  { slug: "barbell", nameDe: "Langhantel", nameEn: "Barbell" },
  { slug: "dumbbell", nameDe: "Kurzhantel", nameEn: "Dumbbell" },
  { slug: "ezbar", nameDe: "SZ-Stange", nameEn: "EZ Bar" },
  { slug: "cable", nameDe: "Kabelzug", nameEn: "Cable" },
  { slug: "machine", nameDe: "Maschine", nameEn: "Machine" },
  { slug: "smith", nameDe: "Multipresse", nameEn: "Smith Machine" },
  { slug: "bodyweight", nameDe: "Körpergewicht", nameEn: "Bodyweight" },
  { slug: "kettlebell", nameDe: "Kettlebell", nameEn: "Kettlebell" },
  { slug: "band", nameDe: "Widerstandsband", nameEn: "Resistance Band" },
  { slug: "plate", nameDe: "Hantelscheibe", nameEn: "Weight Plate" },
];

type ExSeed = {
  nameDe: string;
  nameEn: string;
  primary: string;
  equipment: string | null;
  secondary?: string[];
  mechanic?: "compound" | "isolation";
  force?: "push" | "pull" | "static";
  category?: "strength" | "cardio" | "stretching";
  instructions?: string;
};

const E = (
  nameDe: string,
  nameEn: string,
  primary: string,
  equipment: string | null,
  opts: Partial<ExSeed> = {},
): ExSeed => ({ nameDe, nameEn, primary, equipment, ...opts });

const exercises: ExSeed[] = [
  // ---------- BRUST ----------
  E("Bankdrücken (Langhantel)", "Barbell Bench Press", "chest", "barbell", { secondary: ["triceps", "shoulders"], mechanic: "compound" }),
  E("Schrägbankdrücken (Langhantel)", "Incline Barbell Bench Press", "chest", "barbell", { secondary: ["shoulders", "triceps"], mechanic: "compound" }),
  E("Negativbankdrücken (Langhantel)", "Decline Barbell Bench Press", "chest", "barbell", { secondary: ["triceps"], mechanic: "compound" }),
  E("Bankdrücken (Kurzhantel)", "Dumbbell Bench Press", "chest", "dumbbell", { secondary: ["triceps", "shoulders"], mechanic: "compound" }),
  E("Schrägbankdrücken (Kurzhantel)", "Incline Dumbbell Press", "chest", "dumbbell", { secondary: ["shoulders", "triceps"], mechanic: "compound" }),
  E("Negativbankdrücken (Kurzhantel)", "Decline Dumbbell Press", "chest", "dumbbell", { secondary: ["triceps"], mechanic: "compound" }),
  E("Bankdrücken (Maschine)", "Machine Chest Press", "chest", "machine", { secondary: ["triceps"], mechanic: "compound" }),
  E("Bankdrücken (Multipresse)", "Smith Machine Bench Press", "chest", "smith", { secondary: ["triceps"], mechanic: "compound" }),
  E("Fliegende (Kurzhantel)", "Dumbbell Fly", "chest", "dumbbell", { mechanic: "isolation" }),
  E("Schräge Fliegende (Kurzhantel)", "Incline Dumbbell Fly", "chest", "dumbbell", { mechanic: "isolation" }),
  E("Kabelzug Fliegende", "Cable Fly", "chest", "cable", { mechanic: "isolation" }),
  E("Kabelzug Crossover (hoch)", "High Cable Crossover", "chest", "cable", { mechanic: "isolation" }),
  E("Kabelzug Crossover (tief)", "Low Cable Crossover", "chest", "cable", { mechanic: "isolation" }),
  E("Butterfly (Maschine)", "Pec Deck Fly", "chest", "machine", { mechanic: "isolation" }),
  E("Liegestütze", "Push-Up", "chest", "bodyweight", { secondary: ["triceps", "shoulders"], mechanic: "compound" }),
  E("Liegestütze breit", "Wide Push-Up", "chest", "bodyweight", { secondary: ["shoulders"], mechanic: "compound" }),
  E("Dips (Brust)", "Chest Dip", "chest", "bodyweight", { secondary: ["triceps", "shoulders"], mechanic: "compound" }),
  E("Überzüge (Kurzhantel)", "Dumbbell Pullover", "chest", "dumbbell", { secondary: ["lats"], mechanic: "compound" }),

  // ---------- RÜCKEN / LAT ----------
  E("Klimmzüge (breit)", "Wide Grip Pull-Up", "lats", "bodyweight", { secondary: ["biceps", "back"], mechanic: "compound", force: "pull" }),
  E("Klimmzüge (eng)", "Close Grip Pull-Up", "lats", "bodyweight", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Klimmzüge (Untergriff)", "Chin-Up", "lats", "bodyweight", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug (breit)", "Wide Lat Pulldown", "lats", "cable", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug (eng)", "Close Grip Lat Pulldown", "lats", "cable", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug (Untergriff)", "Underhand Lat Pulldown", "lats", "cable", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug am Seil", "Rope Lat Pulldown", "lats", "cable", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Langhantelrudern", "Barbell Row", "back", "barbell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Langhantelrudern (Untergriff)", "Underhand Barbell Row", "back", "barbell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Kurzhantelrudern (einarmig)", "One-Arm Dumbbell Row", "back", "dumbbell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Kabelrudern sitzend", "Seated Cable Row", "back", "cable", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Kabelrudern am Seil", "Rope Cable Row", "back", "cable", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("T-Bar Rudern", "T-Bar Row", "back", "barbell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Maschinenrudern", "Machine Row", "back", "machine", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Rudern an der Multipresse", "Smith Machine Row", "back", "smith", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Face Pulls", "Face Pull", "back", "cable", { secondary: ["shoulders", "traps"], mechanic: "isolation", force: "pull" }),
  E("Überzüge am Kabel", "Straight-Arm Cable Pullover", "lats", "cable", { mechanic: "isolation", force: "pull" }),

  // ---------- KREUZHEBEN / UNTERER RÜCKEN ----------
  E("Kreuzheben (Langhantel)", "Deadlift", "lowerback", "barbell", { secondary: ["glutes", "hamstrings", "back"], mechanic: "compound", force: "pull" }),
  E("Sumo-Kreuzheben", "Sumo Deadlift", "lowerback", "barbell", { secondary: ["glutes", "quads"], mechanic: "compound", force: "pull" }),
  E("Rumänisches Kreuzheben", "Romanian Deadlift", "hamstrings", "barbell", { secondary: ["glutes", "lowerback"], mechanic: "compound", force: "pull" }),
  E("Kreuzheben (Kurzhantel)", "Dumbbell Deadlift", "lowerback", "dumbbell", { secondary: ["glutes", "hamstrings"], mechanic: "compound", force: "pull" }),
  E("Hyperextensions", "Back Extension", "lowerback", "bodyweight", { secondary: ["glutes", "hamstrings"], mechanic: "isolation" }),
  E("Good Mornings", "Good Morning", "lowerback", "barbell", { secondary: ["hamstrings", "glutes"], mechanic: "compound" }),

  // ---------- SCHULTERN ----------
  E("Schulterdrücken (Langhantel)", "Overhead Press", "shoulders", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Schulterdrücken (Kurzhantel)", "Dumbbell Shoulder Press", "shoulders", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Schulterdrücken (Maschine)", "Machine Shoulder Press", "shoulders", "machine", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Arnold Press", "Arnold Press", "shoulders", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Seitheben (Kurzhantel)", "Dumbbell Lateral Raise", "shoulders", "dumbbell", { mechanic: "isolation" }),
  E("Seitheben (Kabel)", "Cable Lateral Raise", "shoulders", "cable", { mechanic: "isolation" }),
  E("Seitheben (Maschine)", "Machine Lateral Raise", "shoulders", "machine", { mechanic: "isolation" }),
  E("Frontheben (Kurzhantel)", "Dumbbell Front Raise", "shoulders", "dumbbell", { mechanic: "isolation" }),
  E("Frontheben (Kabel)", "Cable Front Raise", "shoulders", "cable", { mechanic: "isolation" }),
  E("Frontheben (Hantelscheibe)", "Plate Front Raise", "shoulders", "plate", { mechanic: "isolation" }),
  E("Reverse Flys (Kurzhantel)", "Reverse Dumbbell Fly", "shoulders", "dumbbell", { secondary: ["back"], mechanic: "isolation" }),
  E("Reverse Flys (Maschine)", "Reverse Pec Deck", "shoulders", "machine", { secondary: ["back"], mechanic: "isolation" }),
  E("Aufrechtes Rudern (Langhantel)", "Upright Row", "shoulders", "barbell", { secondary: ["traps"], mechanic: "compound", force: "pull" }),
  E("Aufrechtes Rudern (Kabel)", "Cable Upright Row", "shoulders", "cable", { secondary: ["traps"], mechanic: "compound", force: "pull" }),

  // ---------- TRAPEZ ----------
  E("Shrugs (Langhantel)", "Barbell Shrug", "traps", "barbell", { mechanic: "isolation" }),
  E("Shrugs (Kurzhantel)", "Dumbbell Shrug", "traps", "dumbbell", { mechanic: "isolation" }),
  E("Shrugs (Kabel)", "Cable Shrug", "traps", "cable", { mechanic: "isolation" }),
  E("Shrugs (Multipresse)", "Smith Machine Shrug", "traps", "smith", { mechanic: "isolation" }),

  // ---------- BIZEPS ----------
  E("Bizeps Curls (Kurzhantel)", "Dumbbell Biceps Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls (Langhantel)", "Barbell Biceps Curl", "biceps", "barbell", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls (SZ-Stange)", "EZ Bar Biceps Curl", "biceps", "ezbar", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls (Kabel)", "Cable Biceps Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls am Seil", "Rope Cable Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Hammer Curls (Kurzhantel)", "Hammer Curl", "biceps", "dumbbell", { secondary: ["forearms"], mechanic: "isolation", force: "pull" }),
  E("Hammer Curls am Seil", "Rope Hammer Curl", "biceps", "cable", { secondary: ["forearms"], mechanic: "isolation", force: "pull" }),
  E("Konzentrationscurls", "Concentration Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Scott Curls (SZ-Stange)", "Preacher Curl", "biceps", "ezbar", { mechanic: "isolation", force: "pull" }),
  E("Scott Curls (Maschine)", "Machine Preacher Curl", "biceps", "machine", { mechanic: "isolation", force: "pull" }),
  E("Spider Curls", "Spider Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Incline Curls", "Incline Dumbbell Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Drag Curls (Langhantel)", "Drag Curl", "biceps", "barbell", { mechanic: "isolation", force: "pull" }),
  E("21er Curls", "21s Curl", "biceps", "barbell", { mechanic: "isolation", force: "pull" }),

  // ---------- TRIZEPS ----------
  E("Trizepsdrücken am Kabel (Stange)", "Tricep Pushdown", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Trizepsdrücken am Seil", "Rope Tricep Pushdown", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Überkopf-Trizepsstrecken (Seil)", "Overhead Rope Extension", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("French Press (SZ-Stange)", "Skull Crusher", "triceps", "ezbar", { mechanic: "isolation", force: "push" }),
  E("French Press (Kurzhantel)", "Dumbbell Skull Crusher", "triceps", "dumbbell", { mechanic: "isolation", force: "push" }),
  E("Überkopf-Trizepsstrecken (Kurzhantel)", "Overhead Dumbbell Extension", "triceps", "dumbbell", { mechanic: "isolation", force: "push" }),
  E("Kickbacks (Kurzhantel)", "Dumbbell Kickback", "triceps", "dumbbell", { mechanic: "isolation", force: "push" }),
  E("Kickbacks (Kabel)", "Cable Kickback", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Enges Bankdrücken", "Close Grip Bench Press", "triceps", "barbell", { secondary: ["chest"], mechanic: "compound", force: "push" }),
  E("Dips (Trizeps)", "Tricep Dip", "triceps", "bodyweight", { secondary: ["chest"], mechanic: "compound", force: "push" }),
  E("Bankdips", "Bench Dip", "triceps", "bodyweight", { mechanic: "compound", force: "push" }),
  E("Diamant-Liegestütze", "Diamond Push-Up", "triceps", "bodyweight", { secondary: ["chest"], mechanic: "compound", force: "push" }),

  // ---------- UNTERARME ----------
  E("Handgelenk-Curls (Langhantel)", "Barbell Wrist Curl", "forearms", "barbell", { mechanic: "isolation" }),
  E("Reverse Curls (SZ-Stange)", "Reverse EZ Bar Curl", "forearms", "ezbar", { secondary: ["biceps"], mechanic: "isolation", force: "pull" }),
  E("Farmer's Walk", "Farmer's Walk", "forearms", "dumbbell", { secondary: ["traps"], mechanic: "compound" }),

  // ---------- QUADRIZEPS / BEINE ----------
  E("Kniebeugen (Langhantel)", "Barbell Squat", "quads", "barbell", { secondary: ["glutes", "hamstrings"], mechanic: "compound" }),
  E("Frontkniebeugen", "Front Squat", "quads", "barbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Kniebeugen (Multipresse)", "Smith Machine Squat", "quads", "smith", { secondary: ["glutes"], mechanic: "compound" }),
  E("Goblet Squat", "Goblet Squat", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Beinpresse", "Leg Press", "quads", "machine", { secondary: ["glutes", "hamstrings"], mechanic: "compound" }),
  E("Hackenschmidt-Kniebeuge", "Hack Squat", "quads", "machine", { secondary: ["glutes"], mechanic: "compound" }),
  E("Beinstrecker", "Leg Extension", "quads", "machine", { mechanic: "isolation" }),
  E("Ausfallschritte (Kurzhantel)", "Dumbbell Lunge", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Ausfallschritte (Langhantel)", "Barbell Lunge", "quads", "barbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Bulgarische Kniebeuge", "Bulgarian Split Squat", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Step-Ups", "Step-Up", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),

  // ---------- BEINBEUGER ----------
  E("Beinbeuger liegend", "Lying Leg Curl", "hamstrings", "machine", { mechanic: "isolation" }),
  E("Beinbeuger sitzend", "Seated Leg Curl", "hamstrings", "machine", { mechanic: "isolation" }),
  E("Nordic Curls", "Nordic Hamstring Curl", "hamstrings", "bodyweight", { mechanic: "isolation" }),

  // ---------- GESÄSS ----------
  E("Hip Thrust (Langhantel)", "Barbell Hip Thrust", "glutes", "barbell", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Glute Bridge", "Glute Bridge", "glutes", "bodyweight", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Kickbacks am Kabel (Bein)", "Cable Glute Kickback", "glutes", "cable", { mechanic: "isolation" }),
  E("Abduktoren-Maschine", "Hip Abduction Machine", "glutes", "machine", { mechanic: "isolation" }),

  // ---------- WADEN ----------
  E("Wadenheben stehend", "Standing Calf Raise", "calves", "machine", { mechanic: "isolation" }),
  E("Wadenheben sitzend", "Seated Calf Raise", "calves", "machine", { mechanic: "isolation" }),
  E("Wadenheben (Beinpresse)", "Leg Press Calf Raise", "calves", "machine", { mechanic: "isolation" }),
  E("Wadenheben (Kurzhantel)", "Dumbbell Calf Raise", "calves", "dumbbell", { mechanic: "isolation" }),

  // ---------- BAUCH ----------
  E("Crunches", "Crunch", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Beinheben hängend", "Hanging Leg Raise", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Beinheben liegend", "Lying Leg Raise", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Plank", "Plank", "abs", "bodyweight", { secondary: ["obliques"], mechanic: "isolation", force: "static" }),
  E("Kabel-Crunches", "Cable Crunch", "abs", "cable", { mechanic: "isolation" }),
  E("Sit-Ups", "Sit-Up", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Russian Twists", "Russian Twist", "obliques", "bodyweight", { secondary: ["abs"], mechanic: "isolation" }),
  E("Seitlicher Plank", "Side Plank", "obliques", "bodyweight", { mechanic: "isolation", force: "static" }),
  E("Holzhacker am Kabel", "Cable Woodchopper", "obliques", "cable", { secondary: ["abs"], mechanic: "isolation" }),
  E("Mountain Climbers", "Mountain Climber", "abs", "bodyweight", { secondary: ["cardio"], mechanic: "compound" }),
  E("Ab Wheel Rollout", "Ab Wheel Rollout", "abs", "bodyweight", { mechanic: "isolation" }),

  // ---------- GANZKÖRPER / FUNKTIONELL ----------
  E("Kettlebell Swing", "Kettlebell Swing", "fullbody", "kettlebell", { secondary: ["glutes", "hamstrings"], mechanic: "compound" }),
  E("Clean and Press", "Clean and Press", "fullbody", "barbell", { secondary: ["shoulders", "quads"], mechanic: "compound" }),
  E("Thruster", "Thruster", "fullbody", "barbell", { secondary: ["quads", "shoulders"], mechanic: "compound" }),
  E("Burpees", "Burpee", "fullbody", "bodyweight", { secondary: ["cardio"], mechanic: "compound" }),
  E("Wall Balls", "Wall Ball", "fullbody", "bodyweight", { secondary: ["quads", "shoulders"], mechanic: "compound" }),
  E("Box Jumps", "Box Jump", "quads", "bodyweight", { secondary: ["glutes", "cardio"], mechanic: "compound" }),

  // ---------- CARDIO ----------
  E("Laufband", "Treadmill", "cardio", "machine", { category: "cardio", mechanic: "compound" }),
  E("Rudergerät", "Rowing Machine", "cardio", "machine", { category: "cardio", secondary: ["back"], mechanic: "compound" }),
  E("Fahrradergometer", "Stationary Bike", "cardio", "machine", { category: "cardio", mechanic: "compound" }),
  E("Crosstrainer", "Elliptical", "cardio", "machine", { category: "cardio", mechanic: "compound" }),
  E("Stairmaster", "Stair Climber", "cardio", "machine", { category: "cardio", mechanic: "compound" }),
  E("Seilspringen", "Jump Rope", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
  E("Laufen (draußen)", "Outdoor Running", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
];

// Fertige Vorlagen: [Übungsname (nameDe), Zielsätze, Zielwdh.]
type PresetEx = [string, number, number];
const presets: { name: string; description: string; exercises: PresetEx[] }[] = [
  {
    name: "Push Day",
    description: "Brust, Schultern, Trizeps",
    exercises: [
      ["Bankdrücken (Langhantel)", 4, 8],
      ["Schrägbankdrücken (Kurzhantel)", 3, 10],
      ["Schulterdrücken (Kurzhantel)", 3, 10],
      ["Seitheben (Kurzhantel)", 3, 15],
      ["Trizepsdrücken am Seil", 3, 12],
      ["Überkopf-Trizepsstrecken (Seil)", 3, 12],
    ],
  },
  {
    name: "Pull Day",
    description: "Rücken, Bizeps, hintere Schulter",
    exercises: [
      ["Klimmzüge (breit)", 4, 8],
      ["Langhantelrudern", 4, 10],
      ["Latzug (eng)", 3, 12],
      ["Face Pulls", 3, 15],
      ["Bizeps Curls (Langhantel)", 3, 10],
      ["Hammer Curls (Kurzhantel)", 3, 12],
    ],
  },
  {
    name: "Leg Day",
    description: "Beine komplett",
    exercises: [
      ["Kniebeugen (Langhantel)", 4, 8],
      ["Rumänisches Kreuzheben", 3, 10],
      ["Beinpresse", 3, 12],
      ["Beinbeuger liegend", 3, 12],
      ["Wadenheben stehend", 4, 15],
    ],
  },
  {
    name: "Oberkörper",
    description: "Push & Pull kombiniert",
    exercises: [
      ["Bankdrücken (Langhantel)", 4, 8],
      ["Langhantelrudern", 4, 8],
      ["Schulterdrücken (Kurzhantel)", 3, 10],
      ["Latzug (breit)", 3, 12],
      ["Bizeps Curls (SZ-Stange)", 3, 10],
      ["Trizepsdrücken am Seil", 3, 12],
    ],
  },
  {
    name: "Unterkörper",
    description: "Beine & unterer Rücken",
    exercises: [
      ["Kniebeugen (Langhantel)", 4, 8],
      ["Rumänisches Kreuzheben", 4, 8],
      ["Ausfallschritte (Kurzhantel)", 3, 12],
      ["Beinstrecker", 3, 15],
      ["Wadenheben sitzend", 4, 15],
    ],
  },
  {
    name: "Ganzkörper",
    description: "Effizientes Komplett-Workout",
    exercises: [
      ["Kniebeugen (Langhantel)", 3, 8],
      ["Bankdrücken (Langhantel)", 3, 8],
      ["Langhantelrudern", 3, 8],
      ["Schulterdrücken (Langhantel)", 3, 10],
      ["Bizeps Curls (Kurzhantel)", 2, 12],
      ["Crunches", 3, 20],
    ],
  },
];

async function seedPresets() {
  console.log(`Seeding ${presets.length} workout presets...`);
  for (const preset of presets) {
    const existing = await db.routine.findFirst({
      where: { name: preset.name, isPreset: true },
    });
    if (existing) continue;

    const routine = await db.routine.create({
      data: {
        name: preset.name,
        description: preset.description,
        isPreset: true,
      },
    });
    let position = 0;
    for (const [exName, sets, reps] of preset.exercises) {
      const ex = await db.exercise.findFirst({ where: { nameDe: exName } });
      if (!ex) {
        console.warn(`  Preset-Übung nicht gefunden: ${exName}`);
        continue;
      }
      await db.routineExercise.create({
        data: {
          routineId: routine.id,
          exerciseId: ex.id,
          position: position++,
          targetSets: sets,
          targetReps: reps,
          targetRestSec: 90,
        },
      });
    }
  }
}

// Legt einen initialen Admin-Account an, falls noch keiner existiert.
async function seedAdmin() {
  const count = await db.user.count();
  if (count > 0) {
    console.log(`Skipping admin seed (${count} user(s) already exist).`);
    return;
  }
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "train1234";
  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { username, passwordHash, isAdmin: true } });
  console.log(
    `Created admin user "${username}".` +
      (process.env.ADMIN_PASSWORD
        ? ""
        : ` Default password "${password}" – BITTE NACH DEM ERSTEN LOGIN ÄNDERN!`),
  );
}

async function main() {
  console.log("Seeding muscle groups & equipment...");
  for (const m of muscleGroups) {
    await db.muscleGroup.upsert({ where: { slug: m.slug }, update: m, create: m });
  }
  for (const eq of equipment) {
    await db.equipment.upsert({ where: { slug: eq.slug }, update: eq, create: eq });
  }

  const muscleMap = new Map((await db.muscleGroup.findMany()).map((m) => [m.slug, m.id]));
  const equipMap = new Map((await db.equipment.findMany()).map((e) => [e.slug, e.id]));

  console.log(`Seeding ${exercises.length} exercises...`);
  let created = 0;
  for (const ex of exercises) {
    const primaryMuscleId = muscleMap.get(ex.primary);
    if (!primaryMuscleId) throw new Error(`Unknown muscle slug: ${ex.primary}`);
    const equipmentId = ex.equipment ? equipMap.get(ex.equipment) ?? null : null;

    const existing = await db.exercise.findFirst({ where: { nameDe: ex.nameDe } });
    const data = {
      nameDe: ex.nameDe,
      nameEn: ex.nameEn,
      primaryMuscleId,
      equipmentId,
      secondaryMuscles: (ex.secondary ?? []).join(","),
      category: ex.category ?? "strength",
      mechanic: ex.mechanic ?? "isolation",
      forceType: ex.force ?? "push",
      instructions: ex.instructions ?? "",
      isCustom: false,
    };
    if (existing) {
      await db.exercise.update({ where: { id: existing.id }, data });
    } else {
      await db.exercise.create({ data });
      created++;
    }
  }

  await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      units: "kg",
      theme: "dark",
      goal: "hypertrophy",
      experience: "intermediate",
      coachStyle: "balanced",
    },
  });

  await seedPresets();
  await seedAdmin();

  console.log(`Done. ${created} new exercises created, ${exercises.length} total processed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
