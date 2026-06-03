// Hilfen für individuelle Sätze in Vorlagen. Ist setsJson gesetzt, gilt es als
// Quelle (pro Satz Gewicht + Wdh); sonst werden gleichförmige Sätze aus
// targetSets/targetReps/targetWeight gebildet (Abwärtskompatibilität).

export type RoutineSet = { reps: number; weight: number };

export function parseRoutineSets(re: {
  setsJson: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}): RoutineSet[] {
  const raw = re.setsJson?.trim();
  if (raw && raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((s) => ({
          reps: Math.max(0, Math.round(Number((s as RoutineSet)?.reps) || 0)),
          weight: Math.max(0, Number((s as RoutineSet)?.weight) || 0),
        }));
      }
    } catch {
      /* ungültiges JSON -> Fallback unten */
    }
  }
  const n = Math.max(1, re.targetSets || 1);
  return Array.from({ length: n }, () => ({
    reps: re.targetReps || 0,
    weight: re.targetWeight || 0,
  }));
}

// Kompakte Zusammenfassung der Sätze (für Listen-Vorschau), z. B.
// "3×10 @ 40 kg" oder "30×10 · 35×8" bei individuellen Sätzen.
export function summarizeSets(sets: RoutineSet[]): string {
  if (sets.length === 0) return "—";
  const uniform = sets.every(
    (s) => s.reps === sets[0].reps && s.weight === sets[0].weight,
  );
  if (uniform) {
    const w = sets[0].weight > 0 ? ` @ ${sets[0].weight} kg` : "";
    return `${sets.length}×${sets[0].reps}${w}`;
  }
  return sets
    .map((s) => (s.weight > 0 ? `${s.weight}×${s.reps}` : `${s.reps}`))
    .join(" · ");
}
