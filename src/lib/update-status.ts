// Gemeinsame, browser-sichere Typen & Helfer für den Update-Fortschritt.
// WICHTIG: hier KEINE node:*-Importe (wird auch im Client gebündelt).
// Datei-IO liegt in update-status.server.ts.

export type UpdateStepKey =
  | "start"
  | "pull"
  | "install"
  | "migrate"
  | "seed"
  | "build"
  | "reload"
  | "done";

export type UpdateStatusState = "idle" | "running" | "success" | "error";

export type UpdateStatus = {
  state: UpdateStatusState;
  step: UpdateStepKey;
  startedAt: string | null;
  updatedAt: string | null;
  fromSha: string | null;
  toSha: string | null;
  message: string;
  error: string;
};

// Reihenfolge, Anzeigetexte und grobe Dauer (Sekunden) je Schritt.
// Single source of truth fürs UI: Fortschrittsbalken, Schrittliste und
// Rest-Schätzung leiten sich hieraus ab. Die etaSec sind Erfahrungswerte
// (install/build dominieren) – nur als grobe Orientierung gedacht.
export const UPDATE_STEPS: {
  key: UpdateStepKey;
  label: string;
  etaSec: number;
}[] = [
  { key: "start", label: "Update wird vorbereitet", etaSec: 2 },
  { key: "pull", label: "Code von GitHub holen", etaSec: 3 },
  { key: "install", label: "Abhängigkeiten installieren", etaSec: 40 },
  { key: "migrate", label: "Datenbank migrieren", etaSec: 5 },
  { key: "seed", label: "Daten aktualisieren", etaSec: 5 },
  { key: "build", label: "App neu bauen", etaSec: 55 },
  { key: "reload", label: "Server neu starten", etaSec: 6 },
  { key: "done", label: "Update abgeschlossen", etaSec: 0 },
];

// Maximale Zeit ohne Status-Aktualisierung, ab der ein "running" als
// verwaist gilt (z. B. Server hart gekillt). Danach erscheint der Button
// wieder, statt für immer zu blockieren.
export const UPDATE_STALE_MS = 15 * 60 * 1000;

export function stepIndex(key: UpdateStepKey): number {
  const i = UPDATE_STEPS.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

// Fortschritt in Prozent (start = 0 %, done = 100 %).
export function stepProgress(key: UpdateStepKey): number {
  const last = UPDATE_STEPS.length - 1;
  return Math.round((stepIndex(key) / last) * 100);
}

// Grobe Restzeit in Sekunden: Summe der etaSec aller noch folgenden Schritte.
export function remainingEtaSec(key: UpdateStepKey): number {
  const i = stepIndex(key);
  return UPDATE_STEPS.slice(i + 1).reduce((sum, s) => sum + s.etaSec, 0);
}

// Läuft gerade ein Update? "running" und nicht verwaist.
export function isUpdateActive(
  status: UpdateStatus | null,
  now: number = Date.now(),
): boolean {
  if (!status || status.state !== "running") return false;
  const ts = status.updatedAt ? Date.parse(status.updatedAt) : NaN;
  if (Number.isNaN(ts)) return true;
  return now - ts < UPDATE_STALE_MS;
}
