import { db } from "@/lib/db";
import {
  type CoachProfile,
  type Goal,
  type Experience,
  type CoachStyle,
  type RepStyle,
  DEFAULT_PROFILE,
} from "@/lib/coach";

// Lädt das Coach-Profil aus den Settings (Singleton) als typisiertes Objekt.
export async function loadCoachProfile(): Promise<CoachProfile> {
  const s = await db.settings.findUnique({ where: { id: "singleton" } });
  if (!s) return DEFAULT_PROFILE;
  return {
    goal: (s.goal as Goal) || "hypertrophy",
    experience: (s.experience as Experience) || "intermediate",
    coachStyle: (s.coachStyle as CoachStyle) || "balanced",
    bodyweightKg: s.bodyweightKg ?? null,
    heightCm: s.heightCm ?? null,
    birthYear: s.birthYear ?? null,
    sex: s.sex ?? "",
    trainingDaysPerWeek: s.trainingDaysPerWeek ?? null,
    limitations: s.limitations ?? "",
    availableEquipment: s.availableEquipment ?? "",
    preferredRepStyle: (s.preferredRepStyle as RepStyle) || "auto",
  };
}
