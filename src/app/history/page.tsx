import { redirect } from "next/navigation";

// Der Verlauf ist kein eigener Tab mehr, sondern Teil der Kalender-Seite.
// Alte Links/Bookmarks auf /history leiten dorthin weiter.
export default function HistoryPage() {
  redirect("/calendar");
}
