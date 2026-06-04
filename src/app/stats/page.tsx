import { redirect } from "next/navigation";

// Statistik ist jetzt ein Tab im Kalender.
export default function StatsRedirect() {
  redirect("/calendar");
}
