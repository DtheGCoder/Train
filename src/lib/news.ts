// Neuigkeiten-Postfach: redaktionelle Einträge (Changelog). Neueste zuerst.
// Pro Eintrag eine stabile id (für den Gelesen-Status), Datum, Titel, kurze
// Zusammenfassung, optionales Bild und strukturierte Highlights mit Icons.

export type NewsHighlight = {
  icon: string; // lucide-Iconname (siehe news-inbox.tsx Mapping)
  title: string;
  text: string;
};

export type NewsItem = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  category: string; // kurzes Label, z. B. "Update"
  title: string;
  summary: string;
  images?: string[]; // Pfade unter /public
  highlights: NewsHighlight[];
  footer?: string;
};

export const NEWS: NewsItem[] = [
  {
    id: "2026-06-04-nutrition-coach",
    date: "2026-06-04",
    category: "Großes Update",
    title: "Ernährungs-Coach, smarter Coach & ein aufgeräumtes Menü",
    summary:
      "Neuer Ernährungs-Tab mit Tageszielen, Wochenvolumen-Intelligenz, Bereitschafts-Check, PR-Prognose und eine klar gegliederte Analyse.",
    images: ["/news/nutrition.svg", "/news/coach.svg"],
    highlights: [
      {
        icon: "apple",
        title: "Neuer Ernährungs-Coach",
        text: "Eigener Tab „Ernährung“: persönliche Tagesziele (Kalorien, Protein, Carbs, Fett, Wasser) aus deinem Profil und dem Trainingstag. Abhakbarer Tagesplan mit Mahlzeiten, Post-Workout-Shake und Supplementen inkl. Dosierung – mit animierten Fortschrittsringen.",
      },
      {
        icon: "flame",
        title: "Zufuhr direkt nach dem Workout",
        text: "Nach dem Training berechnet der Coach aus deinen Daten und dem Umfang, wie viel Protein und Kohlenhydrate du jetzt zuführen solltest.",
      },
      {
        icon: "layers",
        title: "Wochenvolumen je Muskel",
        text: "Der Coach denkt jetzt übergreifend: Er bewertet die harten Sätze je Muskelgruppe pro Woche (zu wenig / optimal / zu viel), erkennt Dysbalancen und warnt im Training, wenn ein Muskel überlastet wird.",
      },
      {
        icon: "heart",
        title: "Bereitschaft & PR-Prognose",
        text: "Eine tägliche Bereitschafts-Anzeige (erholt / bereit / müde) hilft dir, hart oder locker zu trainieren. Dazu eine Prognose: in wie vielen Einheiten du deinen nächsten Rekord erreichst.",
      },
      {
        icon: "gauge",
        title: "Analyse neu gegliedert",
        text: "Die Coach-Analyse ist jetzt in klare Tabs aufgeteilt: Überblick, Körper, Fortschritt und Ernährung – viel übersichtlicher.",
      },
      {
        icon: "calendar",
        title: "Statistik im Kalender",
        text: "Die Statistik ist in den Kalender umgezogen (Umschalter Kalender ↔ Statistik). Dafür gibt es jetzt den neuen Ernährungs-Tab in der Navigation.",
      },
      {
        icon: "dumbbell",
        title: "Training: faire Muskel-Karte & Gedächtnis",
        text: "Die Muskel-Karte nach dem Workout färbt fairer ein (3 harte Sätze = grün, sekundär zählt mit). Fügst du eine Übung hinzu, die du schon kennst, ist sie wie beim letzten Mal vorbelegt – der Coach erinnert sich.",
      },
    ],
    footer:
      "Viel Spaß beim Ausprobieren! Schau im Profil vorbei und trag Körpergewicht & Größe ein, damit der Ernährungs-Coach perfekt für dich rechnet.",
  },
];

export function unreadCount(readIds: string[]): number {
  const read = new Set(readIds);
  return NEWS.filter((n) => !read.has(n.id)).length;
}

export function parseReadIds(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}
