// Kanonische Stammdaten für Seed & Pro-Nutzer-Provisionierung.
// Reines Datenmodul ohne DB-Zugriff – importierbar aus dem Seed-Skript (tsx)
// und aus den Server-Actions (Next).

export const muscleGroups = [
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

export const equipment = [
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

export type ExSeed = {
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

export const exercises: ExSeed[] = [
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

  // ========================================================================
  // ERWEITERUNG – zusätzlicher Katalog (Varianten & weitere Übungen)
  // ========================================================================

  // ---------- BRUST (Erweiterung) ----------
  E("Schrägbankdrücken (Maschine)", "Incline Machine Press", "chest", "machine", { secondary: ["shoulders", "triceps"], mechanic: "compound", force: "push" }),
  E("Negativbankdrücken (Maschine)", "Decline Machine Press", "chest", "machine", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Schrägbankdrücken (Multipresse)", "Incline Smith Press", "chest", "smith", { secondary: ["shoulders", "triceps"], mechanic: "compound", force: "push" }),
  E("Negativbankdrücken (Multipresse)", "Decline Smith Press", "chest", "smith", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Floor Press (Langhantel)", "Barbell Floor Press", "chest", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Floor Press (Kurzhantel)", "Dumbbell Floor Press", "chest", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Hex Press (Kurzhantel)", "Dumbbell Hex Press", "chest", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Brustpresse (Kabel, stehend)", "Standing Cable Press", "chest", "cable", { secondary: ["triceps", "shoulders"], mechanic: "compound", force: "push" }),
  E("Landmine-Drücken", "Landmine Press", "chest", "barbell", { secondary: ["shoulders", "triceps"], mechanic: "compound", force: "push" }),
  E("Svend Press", "Svend Press", "chest", "plate", { mechanic: "isolation", force: "push" }),
  E("Schräge Kabelfliegende", "Incline Cable Fly", "chest", "cable", { mechanic: "isolation" }),
  E("Negativ-Fliegende (Kurzhantel)", "Decline Dumbbell Fly", "chest", "dumbbell", { mechanic: "isolation" }),
  E("Brustpresse mit Band", "Band Chest Press", "chest", "band", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Fliegende mit Band", "Band Chest Fly", "chest", "band", { mechanic: "isolation" }),
  E("Schräge Liegestütze", "Incline Push-Up", "chest", "bodyweight", { secondary: ["shoulders"], mechanic: "compound", force: "push" }),
  E("Negativ-Liegestütze", "Decline Push-Up", "chest", "bodyweight", { secondary: ["shoulders", "triceps"], mechanic: "compound", force: "push" }),

  // ---------- RÜCKEN / LAT (Erweiterung) ----------
  E("Klimmzüge (neutral)", "Neutral Grip Pull-Up", "lats", "bodyweight", { secondary: ["biceps", "back"], mechanic: "compound", force: "pull" }),
  E("Klimmzüge (gewichtet)", "Weighted Pull-Up", "lats", "bodyweight", { secondary: ["biceps", "back"], mechanic: "compound", force: "pull" }),
  E("Klimmzüge (unterstützt, Maschine)", "Assisted Pull-Up", "lats", "machine", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug (Maschine)", "Machine Lat Pulldown", "lats", "machine", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug einarmig (Kabel)", "Single-Arm Lat Pulldown", "lats", "cable", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Latzug mit Band", "Band Lat Pulldown", "lats", "band", { secondary: ["biceps"], mechanic: "compound", force: "pull" }),
  E("Pendlay Rudern", "Pendlay Row", "back", "barbell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Seal Rudern", "Seal Row", "back", "barbell", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Meadows Rudern", "Meadows Row", "back", "barbell", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Brust-gestütztes Rudern (Kurzhantel)", "Chest-Supported Dumbbell Row", "back", "dumbbell", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Schrägbank-Rudern (Kurzhantel)", "Incline Bench Dumbbell Row", "back", "dumbbell", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Invertiertes Rudern", "Inverted Row", "back", "bodyweight", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Kabelrudern breit", "Wide Grip Cable Row", "back", "cable", { secondary: ["lats"], mechanic: "compound", force: "pull" }),
  E("Rudern (Kettlebell)", "Kettlebell Row", "back", "kettlebell", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Rudern mit Band", "Band Row", "back", "band", { secondary: ["lats", "biceps"], mechanic: "compound", force: "pull" }),
  E("Renegade-Rudern (Kurzhantel)", "Renegade Row", "back", "dumbbell", { secondary: ["abs", "lats"], mechanic: "compound", force: "pull" }),

  // ---------- KREUZHEBEN / UNTERER RÜCKEN (Erweiterung) ----------
  E("Trap-Bar-Kreuzheben", "Trap Bar Deadlift", "lowerback", "barbell", { secondary: ["glutes", "quads"], mechanic: "compound", force: "pull" }),
  E("Defizit-Kreuzheben", "Deficit Deadlift", "lowerback", "barbell", { secondary: ["glutes", "hamstrings"], mechanic: "compound", force: "pull" }),
  E("Rack-Kreuzheben", "Rack Pull", "lowerback", "barbell", { secondary: ["back", "traps"], mechanic: "compound", force: "pull" }),
  E("Gestrecktes Kreuzheben (Langhantel)", "Stiff-Legged Deadlift", "hamstrings", "barbell", { secondary: ["glutes", "lowerback"], mechanic: "compound", force: "pull" }),
  E("Einbeiniges Kreuzheben (Kurzhantel)", "Single-Leg RDL", "hamstrings", "dumbbell", { secondary: ["glutes"], mechanic: "compound", force: "pull" }),
  E("Kreuzheben (Kettlebell)", "Kettlebell Deadlift", "lowerback", "kettlebell", { secondary: ["glutes", "hamstrings"], mechanic: "compound", force: "pull" }),
  E("Kabel Pull-Through", "Cable Pull-Through", "glutes", "cable", { secondary: ["hamstrings"], mechanic: "compound", force: "pull" }),
  E("Rückenstrecker (Maschine)", "Machine Back Extension", "lowerback", "machine", { secondary: ["glutes"], mechanic: "isolation" }),
  E("Reverse Hyperextensions", "Reverse Hyperextension", "lowerback", "machine", { secondary: ["glutes"], mechanic: "isolation" }),
  E("Superman", "Superman", "lowerback", "bodyweight", { secondary: ["glutes"], mechanic: "isolation", force: "static" }),
  E("Bird Dog", "Bird Dog", "lowerback", "bodyweight", { secondary: ["glutes", "abs"], mechanic: "isolation", force: "static" }),

  // ---------- SCHULTERN (Erweiterung) ----------
  E("Schulterdrücken sitzend (Kurzhantel)", "Seated Dumbbell Press", "shoulders", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Schulterdrücken (Multipresse)", "Smith Machine Shoulder Press", "shoulders", "smith", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Push Press", "Push Press", "shoulders", "barbell", { secondary: ["triceps", "quads"], mechanic: "compound", force: "push" }),
  E("Nackendrücken (Langhantel)", "Behind-the-Neck Press", "shoulders", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Z-Press (Langhantel)", "Barbell Z Press", "shoulders", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Z-Press (Kurzhantel)", "Dumbbell Z Press", "shoulders", "dumbbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Bradford-Drücken", "Bradford Press", "shoulders", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Schulterdrücken (Kettlebell)", "Kettlebell Shoulder Press", "shoulders", "kettlebell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Landmine-Schulterdrücken", "Landmine Shoulder Press", "shoulders", "barbell", { secondary: ["triceps"], mechanic: "compound", force: "push" }),
  E("Seitheben gelehnt (Kabel)", "Leaning Cable Lateral Raise", "shoulders", "cable", { mechanic: "isolation" }),
  E("Seitheben mit Band", "Band Lateral Raise", "shoulders", "band", { mechanic: "isolation" }),
  E("Y-Heben (Kurzhantel)", "Dumbbell Y-Raise", "shoulders", "dumbbell", { secondary: ["traps"], mechanic: "isolation" }),
  E("Y-Heben (Kabel)", "Cable Y-Raise", "shoulders", "cable", { secondary: ["traps"], mechanic: "isolation" }),
  E("Reverse Fly (Kabel)", "Cable Reverse Fly", "shoulders", "cable", { secondary: ["back"], mechanic: "isolation" }),
  E("Hintere Schulter Rudern (Kurzhantel)", "Rear Delt Row", "shoulders", "dumbbell", { secondary: ["back"], mechanic: "compound", force: "pull" }),
  E("Band Auseinanderziehen", "Band Pull-Apart", "shoulders", "band", { secondary: ["back", "traps"], mechanic: "isolation", force: "pull" }),

  // ---------- TRAPEZ (Erweiterung) ----------
  E("Shrugs hinter dem Rücken (Langhantel)", "Behind-the-Back Shrug", "traps", "barbell", { mechanic: "isolation" }),
  E("Schräg-Shrugs (Kurzhantel)", "Incline Shrug", "traps", "dumbbell", { mechanic: "isolation" }),
  E("Shrugs (Kettlebell)", "Kettlebell Shrug", "traps", "kettlebell", { mechanic: "isolation" }),
  E("Power-Shrugs (Langhantel)", "Power Shrug", "traps", "barbell", { mechanic: "compound" }),

  // ---------- BIZEPS (Erweiterung) ----------
  E("Bizeps Curls (Maschine)", "Machine Biceps Curl", "biceps", "machine", { mechanic: "isolation", force: "pull" }),
  E("Bayesian Curl (Kabel)", "Bayesian Cable Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Hoher Kabel-Curl", "High Cable Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Zottman Curls (Kurzhantel)", "Zottman Curl", "biceps", "dumbbell", { secondary: ["forearms"], mechanic: "isolation", force: "pull" }),
  E("Cross-Body Hammer Curls", "Cross-Body Hammer Curl", "biceps", "dumbbell", { secondary: ["forearms"], mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls sitzend (Kurzhantel)", "Seated Dumbbell Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Scott Curls (Kurzhantel)", "Dumbbell Preacher Curl", "biceps", "dumbbell", { mechanic: "isolation", force: "pull" }),
  E("Konzentrationscurls (Kabel)", "Cable Concentration Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls mit Band", "Band Biceps Curl", "biceps", "band", { mechanic: "isolation", force: "pull" }),
  E("Bizeps Curls (Kettlebell)", "Kettlebell Curl", "biceps", "kettlebell", { mechanic: "isolation", force: "pull" }),

  // ---------- TRIZEPS (Erweiterung) ----------
  E("Trizeps-Strecker (Maschine)", "Machine Triceps Extension", "triceps", "machine", { mechanic: "isolation", force: "push" }),
  E("JM-Press (Langhantel)", "JM Press", "triceps", "barbell", { secondary: ["chest"], mechanic: "compound", force: "push" }),
  E("Tate-Press (Kurzhantel)", "Tate Press", "triceps", "dumbbell", { mechanic: "isolation", force: "push" }),
  E("Trizepsdrücken einarmig (Kabel)", "Single-Arm Cable Pushdown", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Trizepsdrücken Untergriff (Kabel)", "Reverse Grip Pushdown", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Überkopf-Trizepsstrecken (Langhantel)", "Overhead Barbell Extension", "triceps", "barbell", { mechanic: "isolation", force: "push" }),
  E("Überkopf-Trizepsstrecken (SZ-Stange)", "Overhead EZ Bar Extension", "triceps", "ezbar", { mechanic: "isolation", force: "push" }),
  E("Überkopf-Trizepsstrecken (Kabel)", "Overhead Cable Extension", "triceps", "cable", { mechanic: "isolation", force: "push" }),
  E("Trizepsdrücken mit Band", "Band Triceps Pushdown", "triceps", "band", { mechanic: "isolation", force: "push" }),

  // ---------- UNTERARME (Erweiterung) ----------
  E("Reverse Handgelenk-Curls (Langhantel)", "Barbell Reverse Wrist Curl", "forearms", "barbell", { mechanic: "isolation" }),
  E("Handgelenk-Curls (Kurzhantel)", "Dumbbell Wrist Curl", "forearms", "dumbbell", { mechanic: "isolation" }),
  E("Reverse Curls (Langhantel)", "Barbell Reverse Curl", "forearms", "barbell", { secondary: ["biceps"], mechanic: "isolation", force: "pull" }),
  E("Unterarm-Roller", "Wrist Roller", "forearms", "plate", { mechanic: "isolation" }),
  E("Plattengriff-Halten", "Plate Pinch", "forearms", "plate", { mechanic: "isolation", force: "static" }),
  E("Aushängen (Dead Hang)", "Dead Hang", "forearms", "bodyweight", { secondary: ["lats"], mechanic: "isolation", force: "static" }),
  E("Koffer-Tragen (Kurzhantel)", "Suitcase Carry", "forearms", "dumbbell", { secondary: ["obliques"], mechanic: "compound", force: "static" }),

  // ---------- QUADRIZEPS / BEINE (Erweiterung) ----------
  E("Pausen-Kniebeuge (Langhantel)", "Pause Squat", "quads", "barbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Box-Kniebeuge (Langhantel)", "Box Squat", "quads", "barbell", { secondary: ["glutes", "hamstrings"], mechanic: "compound" }),
  E("Zercher-Kniebeuge (Langhantel)", "Zercher Squat", "quads", "barbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Gürtel-Kniebeuge (Maschine)", "Belt Squat", "quads", "machine", { secondary: ["glutes"], mechanic: "compound" }),
  E("Pendel-Kniebeuge (Maschine)", "Pendulum Squat", "quads", "machine", { secondary: ["glutes"], mechanic: "compound" }),
  E("Sissy-Kniebeuge", "Sissy Squat", "quads", "bodyweight", { mechanic: "isolation" }),
  E("Goblet Squat (Kettlebell)", "Kettlebell Goblet Squat", "quads", "kettlebell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Gehende Ausfallschritte (Kurzhantel)", "Walking Lunge", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Rückwärts-Ausfallschritte (Kurzhantel)", "Reverse Lunge", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Curtsy-Ausfallschritte (Kurzhantel)", "Curtsy Lunge", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Split-Kniebeuge (Kurzhantel)", "Split Squat", "quads", "dumbbell", { secondary: ["glutes"], mechanic: "compound" }),
  E("Ausfallschritte (Multipresse)", "Smith Machine Lunge", "quads", "smith", { secondary: ["glutes"], mechanic: "compound" }),
  E("Pistol-Kniebeuge", "Pistol Squat", "quads", "bodyweight", { secondary: ["glutes"], mechanic: "compound" }),
  E("Kniebeugen ohne Gewicht", "Bodyweight Squat", "quads", "bodyweight", { secondary: ["glutes"], mechanic: "compound" }),
  E("Sprungkniebeugen", "Jump Squat", "quads", "bodyweight", { secondary: ["glutes", "calves"], mechanic: "compound" }),
  E("Beinpresse (einbeinig)", "Single-Leg Leg Press", "quads", "machine", { secondary: ["glutes"], mechanic: "compound" }),
  E("Wandsitz", "Wall Sit", "quads", "bodyweight", { mechanic: "isolation", force: "static" }),

  // ---------- BEINBEUGER (Erweiterung) ----------
  E("Beinbeuger stehend (Maschine)", "Standing Leg Curl", "hamstrings", "machine", { mechanic: "isolation" }),
  E("Beinbeuger (Kabel)", "Cable Leg Curl", "hamstrings", "cable", { mechanic: "isolation" }),
  E("Glute-Ham-Raise", "Glute Ham Raise", "hamstrings", "bodyweight", { secondary: ["glutes"], mechanic: "compound" }),
  E("Beinbeuger (Gymnastikball)", "Swiss Ball Leg Curl", "hamstrings", "bodyweight", { secondary: ["glutes"], mechanic: "isolation" }),
  E("Beinbeuger mit Band", "Band Leg Curl", "hamstrings", "band", { mechanic: "isolation" }),

  // ---------- GESÄSS (Erweiterung) ----------
  E("Einbeiniger Hip Thrust", "Single-Leg Hip Thrust", "glutes", "bodyweight", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Hip Thrust (Kurzhantel)", "Dumbbell Hip Thrust", "glutes", "dumbbell", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Hip Thrust (Maschine)", "Machine Hip Thrust", "glutes", "machine", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Hip Thrust (Multipresse)", "Smith Machine Hip Thrust", "glutes", "smith", { secondary: ["hamstrings"], mechanic: "compound" }),
  E("Frosch-Pumpen", "Frog Pump", "glutes", "bodyweight", { secondary: ["hamstrings"], mechanic: "isolation" }),
  E("Hüftabduktion mit Band", "Banded Hip Abduction", "glutes", "band", { mechanic: "isolation" }),
  E("Abduktion stehend (Kabel)", "Standing Cable Abduction", "glutes", "cable", { mechanic: "isolation" }),
  E("Esel-Tritte", "Donkey Kick", "glutes", "bodyweight", { mechanic: "isolation" }),

  // ---------- WADEN (Erweiterung) ----------
  E("Wadenheben stehend (Multipresse)", "Smith Machine Calf Raise", "calves", "smith", { mechanic: "isolation" }),
  E("Wadenheben (Langhantel)", "Barbell Calf Raise", "calves", "barbell", { mechanic: "isolation" }),
  E("Einbeiniges Wadenheben", "Single-Leg Calf Raise", "calves", "bodyweight", { mechanic: "isolation" }),
  E("Einbeiniges Wadenheben (Kurzhantel)", "Single-Leg Dumbbell Calf Raise", "calves", "dumbbell", { mechanic: "isolation" }),
  E("Esel-Wadenheben (Maschine)", "Donkey Calf Raise", "calves", "machine", { mechanic: "isolation" }),
  E("Wadenpresse (Maschine)", "Calf Press", "calves", "machine", { mechanic: "isolation" }),

  // ---------- BAUCH / RUMPF (Erweiterung) ----------
  E("Fahrrad-Crunch", "Bicycle Crunch", "abs", "bodyweight", { secondary: ["obliques"], mechanic: "isolation" }),
  E("Reverse Crunch", "Reverse Crunch", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Toes to Bar", "Toes to Bar", "abs", "bodyweight", { secondary: ["lats"], mechanic: "isolation", force: "pull" }),
  E("Knieheben hängend", "Hanging Knee Raise", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Negativ-Sit-Ups", "Decline Sit-Up", "abs", "bodyweight", { mechanic: "isolation" }),
  E("V-Ups", "V-Up", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Flutter Kicks", "Flutter Kicks", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Hollow Hold", "Hollow Hold", "abs", "bodyweight", { mechanic: "isolation", force: "static" }),
  E("L-Sitz", "L-Sit", "abs", "bodyweight", { mechanic: "isolation", force: "static" }),
  E("Dead Bug", "Dead Bug", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Klappmesser", "Jackknife", "abs", "bodyweight", { mechanic: "isolation" }),
  E("Gewichteter Crunch", "Weighted Crunch", "abs", "plate", { mechanic: "isolation" }),
  E("Bauchmaschine (Crunch)", "Ab Crunch Machine", "abs", "machine", { mechanic: "isolation" }),
  E("Beinheben (Römischer Stuhl)", "Captain's Chair Leg Raise", "abs", "machine", { mechanic: "isolation" }),
  E("Pallof-Press (Kabel)", "Pallof Press", "obliques", "cable", { secondary: ["abs"], mechanic: "isolation", force: "static" }),
  E("Seitbeugen (Kurzhantel)", "Dumbbell Side Bend", "obliques", "dumbbell", { mechanic: "isolation" }),
  E("Seitbeugen (Kabel)", "Cable Side Bend", "obliques", "cable", { mechanic: "isolation" }),
  E("Seitlicher Kabel-Crunch", "Cable Oblique Crunch", "obliques", "cable", { secondary: ["abs"], mechanic: "isolation" }),
  E("Seitliches Beinheben hängend", "Hanging Oblique Raise", "obliques", "bodyweight", { secondary: ["abs"], mechanic: "isolation" }),
  E("Landmine-Rotation", "Landmine Twist", "obliques", "barbell", { secondary: ["abs"], mechanic: "isolation" }),

  // ---------- GANZKÖRPER / FUNKTIONELL (Erweiterung) ----------
  E("Power Clean (Langhantel)", "Power Clean", "fullbody", "barbell", { secondary: ["traps", "quads"], mechanic: "compound", force: "pull" }),
  E("Hang Clean (Langhantel)", "Hang Clean", "fullbody", "barbell", { secondary: ["traps", "quads"], mechanic: "compound", force: "pull" }),
  E("Reißen (Langhantel)", "Snatch", "fullbody", "barbell", { secondary: ["shoulders", "quads"], mechanic: "compound", force: "pull" }),
  E("Umsetzen und Stoßen", "Clean and Jerk", "fullbody", "barbell", { secondary: ["shoulders", "quads"], mechanic: "compound" }),
  E("Türkisch Aufstehen (Kettlebell)", "Turkish Get-Up", "fullbody", "kettlebell", { secondary: ["abs", "shoulders"], mechanic: "compound" }),
  E("Kettlebell Clean", "Kettlebell Clean", "fullbody", "kettlebell", { secondary: ["quads", "traps"], mechanic: "compound", force: "pull" }),
  E("Kettlebell Snatch", "Kettlebell Snatch", "fullbody", "kettlebell", { secondary: ["shoulders"], mechanic: "compound", force: "pull" }),
  E("Devil Press (Kurzhantel)", "Devil Press", "fullbody", "dumbbell", { secondary: ["chest", "shoulders"], mechanic: "compound" }),
  E("Man Maker (Kurzhantel)", "Man Maker", "fullbody", "dumbbell", { secondary: ["chest", "shoulders"], mechanic: "compound" }),
  E("Battle Ropes", "Battle Ropes", "fullbody", "bodyweight", { secondary: ["shoulders"], mechanic: "compound" }),
  E("Medizinball-Slam", "Medicine Ball Slam", "fullbody", "bodyweight", { secondary: ["abs"], mechanic: "compound" }),
  E("Bärengang", "Bear Crawl", "fullbody", "bodyweight", { secondary: ["abs", "shoulders"], mechanic: "compound" }),

  // ---------- CARDIO (Erweiterung) ----------
  E("HIIT-Intervalle", "HIIT Intervals", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
  E("Sprints", "Sprints", "cardio", "bodyweight", { category: "cardio", secondary: ["quads"], mechanic: "compound" }),
  E("Schwimmen", "Swimming", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
  E("Radfahren (draußen)", "Outdoor Cycling", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
  E("Wandern", "Hiking", "cardio", "bodyweight", { category: "cardio", mechanic: "compound" }),
  E("SkiErg", "SkiErg", "cardio", "machine", { category: "cardio", secondary: ["back"], mechanic: "compound" }),
  E("Assault Bike", "Assault Bike", "cardio", "machine", { category: "cardio", mechanic: "compound" }),
  E("Boxsack", "Heavy Bag", "cardio", "bodyweight", { category: "cardio", secondary: ["shoulders"], mechanic: "compound" }),

  // ---------- WEITERE VARIANTEN ----------
  E("Einarmige Kabelfliegende", "Single-Arm Cable Fly", "chest", "cable", { mechanic: "isolation" }),
  E("Seitheben liegend (Kurzhantel)", "Lying Dumbbell Lateral Raise", "shoulders", "dumbbell", { mechanic: "isolation" }),
  E("Plank mit Schulterklopfen", "Plank Shoulder Tap", "abs", "bodyweight", { secondary: ["obliques"], mechanic: "isolation", force: "static" }),
  E("Klimmzüge (Handtuch)", "Towel Pull-Up", "lats", "bodyweight", { secondary: ["forearms", "biceps"], mechanic: "compound", force: "pull" }),
  E("Bizeps Curls einarmig (Kabel)", "Single-Arm Cable Curl", "biceps", "cable", { mechanic: "isolation", force: "pull" }),
  E("Trizepsdrücken (V-Stange, Kabel)", "V-Bar Pushdown", "triceps", "cable", { mechanic: "isolation", force: "push" }),
];

// Fertige Vorlagen: [Übungsname (nameDe), Zielsätze, Zielwdh.]
export type PresetEx = [string, number, number];
export const presets: { name: string; description: string; exercises: PresetEx[] }[] = [
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
