import { exerciseDemoMap } from "@/lib/exercise-demo-data";

// Animierte Bewegungs-Demo aus dem gemeinfreien Datensatz "free-exercise-db"
// (Public Domain / Unlicense). Je Übung gibt es zwei Frames (Start- und
// Endposition); im UI werden sie weich überblendet → flüssige 2-Phasen-Demo.
// Die Bilder werden zur Laufzeit vom jsDelivr-CDN geladen (nicht im Repo
// gespeichert). Nur konservativ gematchte Übungen haben eine Demo – sonst
// bleibt die Muskelkarte als Fallback.

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

export type ExerciseDemo = { frames: [string, string] } | null;

export function getExerciseDemo(nameEn: string): ExerciseDemo {
  const folder = exerciseDemoMap[nameEn.trim().toLowerCase()];
  if (!folder) return null;
  const seg = encodeURIComponent(folder);
  return { frames: [`${CDN}/${seg}/0.jpg`, `${CDN}/${seg}/1.jpg`] };
}

// Hat die Übung eine Bewegungs-Demo? (für das Video-Symbol in der Liste)
export function hasExerciseDemo(nameEn: string): boolean {
  return Boolean(exerciseDemoMap[nameEn.trim().toLowerCase()]);
}
