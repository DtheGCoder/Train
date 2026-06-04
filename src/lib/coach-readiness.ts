// Readiness / Auto-Regulation: schätzt aus Trainingsdichte, letzter Einheit und
// Erholungszeit, wie „bereit" du heute bist – und ob ein harter oder eher
// lockerer Tag sinnvoll ist. Deterministisch, als Orientierung.

export type Readiness = {
  score: number; // 0..100
  label: string; // Erholt / Bereit / Eher müde
  tone: "fresh" | "ready" | "tired";
  advice: string;
};

export function readiness(input: {
  daysSinceLast: number | null; // Tage seit letztem Workout (null = noch keins)
  last7Count: number; // Workouts in den letzten 7 Tagen
  targetDays: number; // angepeilte Trainingstage/Woche
  lastHardSets: number; // harte Sätze der letzten Einheit
  volumeTrendDown: boolean; // Volumen zuletzt rückläufig?
}): Readiness {
  let score = 75;

  // Erholungszeit seit der letzten Einheit.
  if (input.daysSinceLast === null) score = 85;
  else if (input.daysSinceLast >= 3) score += 15;
  else if (input.daysSinceLast === 0) score -= 20;
  else if (input.daysSinceLast === 1) score -= 5;

  // Wochenlast relativ zum Ziel.
  if (input.last7Count > input.targetDays + 1) score -= 18;
  else if (input.last7Count > input.targetDays) score -= 8;

  // Sehr umfangreiche letzte Einheit kostet Erholung.
  if (input.lastHardSets >= 24) score -= 12;
  else if (input.lastHardSets >= 16) score -= 6;

  // Sinkendes Volumen ist ein Ermüdungssignal.
  if (input.volumeTrendDown) score -= 12;

  score = Math.max(20, Math.min(100, Math.round(score)));

  if (score >= 80) {
    return {
      score,
      label: "Erholt",
      tone: "fresh",
      advice:
        "Du bist gut erholt – heute darfst du Vollgas geben und versuchen, dich zu steigern.",
    };
  }
  if (score >= 55) {
    return {
      score,
      label: "Bereit",
      tone: "ready",
      advice: "Solide Erholung – ein normales, forderndes Training passt heute.",
    };
  }
  return {
    score,
    label: "Eher müde",
    tone: "tired",
    advice:
      "Zeichen von Ermüdung – halte die Gewichte, kürze das Volumen etwas oder leg einen Ruhetag ein. Schlaf & Essen priorisieren.",
  };
}
