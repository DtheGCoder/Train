// Neuigkeiten-Postfach: redaktionelle Einträge (Changelog). Neueste zuerst.
// Pro Eintrag eine stabile id (für den Gelesen-Status), Datum, Titel, kurze
// Zusammenfassung, optionales Bild und strukturierte Highlights mit Icons.

export type NewsHighlight = {
  icon: string; // lucide-Iconname (siehe news-inbox.tsx Mapping)
  title: string;
  text: string;
};

export type NewsKind = "update" | "tip" | "info";

export const KIND_LABEL: Record<NewsKind, string> = {
  update: "Updates",
  tip: "Tipps",
  info: "Infos",
};

export type NewsItem = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  kind: NewsKind; // Kategorie fürs Postfach-Filter
  category: string; // kurzes Label, z. B. "Großes Update"
  title: string;
  summary: string;
  images?: string[]; // Pfade unter /public
  highlights: NewsHighlight[];
  footer?: string;
};

export const NEWS: NewsItem[] = [
  {
    id: "2026-06-06-more-achievements-titles",
    date: "2026-06-06",
    kind: "update",
    category: "Update",
    title: "Massiv mehr Achievements & Titel",
    summary:
      "Die Achievements wurden mehr als verdreifacht (jetzt über 170) und der Titel-Tab auf über 90 Titel erweitert – mit vielen neuen Stufen in jeder Kategorie.",
    highlights: [
      {
        icon: "award",
        title: "Über 170 Achievements",
        text: "Mehr als das Dreifache von vorher: feinere Stufen für Workouts, Trainingstage, Serien, Volumen, Sätze, Wiederholungen, Stärke, Vielfalt, Besonderes und Ernährung. Jede Stufe bringt Belohnungspunkte für die Bestenliste – es gibt also fast immer ein nächstes Ziel direkt vor dir.",
      },
      {
        icon: "crown",
        title: "Über 90 Titel",
        text: "Der Titel-Tab ist stark gewachsen: von leicht bis legendär, dazu lustige und geheime Titel. Schalte sie frei und wähle sie im Profil – dein Titel glänzt animiert in der Bestenliste unter deinem Namen.",
      },
    ],
    footer:
      "Schau im Profil unter „Bestenliste“ in die Tabs Achievements & Titel – jede Menge neue Ziele warten auf dich.",
  },
  {
    id: "2026-06-05-fatloss-fooddb",
    date: "2026-06-05",
    kind: "update",
    category: "Update",
    title: "Ziel „Abnehmen“, riesige Lebensmittel-DB & aufgeräumtes Profil",
    summary:
      "Neues Ziel Abnehmen mit Kaloriendefizit, eine große kategorisierte Lebensmittel-Datenbank inkl. Fast Food, Profil-Tabs und animierte Achievement-Pop-ups.",
    highlights: [
      {
        icon: "apple",
        title: "Neues Ziel: Abnehmen",
        text: "Wähle im Profil „Abnehmen“ – der Ernährungs-Coach rechnet dann mit moderatem Kaloriendefizit, hält das Protein hoch (Muskelerhalt) und bezieht dein Körpergewicht und deine Trainings (mehr Aktivität = mehr Spielraum) mit ein.",
      },
      {
        icon: "layers",
        title: "Riesige Lebensmittel-Datenbank",
        text: "Hunderte Lebensmittel, kategorisiert (Protein, Kohlenhydrate, Snacks, Getränke …) – inklusive Fast Food mit echten Werten: Big Mac, McNuggets, Whopper, KFC, Subway, Döner, Pizza & mehr. Im Eintragen-Menü nach Kategorie filterbar.",
      },
      {
        icon: "gauge",
        title: "Profil in Tabs & Pop-ups",
        text: "Der Profilbereich ist jetzt in Tabs gegliedert (Profil · Coach · Mehr). Neu freigeschaltete Achievements feiern dich nach dem Workout mit einem animierten Pop-up. Das Postfach kannst du jetzt nach Kategorien filtern.",
      },
    ],
    footer:
      "Stell im Profil dein Ziel und Körpergewicht ein – dann ist der Ernährungs-Coach perfekt auf dich abgestimmt.",
  },
  {
    id: "2026-06-04-nutrition-coach",
    date: "2026-06-04",
    kind: "update",
    category: "Großes Update",
    title: "Ernährungs-Coach, smarter Coach & ein aufgeräumtes Menü",
    summary:
      "Neuer Ernährungs-Tab mit Tageszielen, Wochenvolumen-Intelligenz, Bereitschafts-Check, PR-Prognose und eine klar gegliederte Analyse.",
    images: ["/news/nutrition.svg", "/news/coach.svg"],
    highlights: [
      {
        icon: "apple",
        title: "Neuer Ernährungs-Coach mit Essens-Tracking",
        text: "Eigener Tab „Ernährung“: persönliche Tagesziele (Kalorien, Protein, Carbs, Fett, Wasser). Trag genau ein, was du isst – aus einer Lebensmittel-Datenbank mit Mengen­angabe oder als eigener Eintrag. Der Coach empfiehlt anhand der noch offenen Nährwerte konkrete Lebensmittel (z. B. Magerquark, Brokkoli) und ganze Mahlzeiten. Plus Wasser-Tracker und Supplemente mit Dosierung.",
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
      {
        icon: "award",
        title: "Achievements, Titel & Belohnungspunkte",
        text: "Über 50 Achievements (auch zur Ernährung!) mit Fortschritt, Filter & Sortierung – Belohnungspunkte zählen in die Bestenliste. Nach jedem Workout siehst du, was du neu freigeschaltet hast (löschst du es, passt sich alles wieder an). Ganz neu: 30 freischaltbare TITEL nach Seltenheit (von leicht bis legendär, dazu lustige und geheime), animiert und auswählbar im Profil oder im neuen Titel-Tab – dein Titel glänzt dann in der Bestenliste unter deinem Namen.",
      },
      {
        icon: "user",
        title: "Profil neu gestaltet",
        text: "Übersichtlicheres, schöneres Profil mit sanften Animationen – und du kannst jetzt deinen Anzeigenamen ändern.",
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
