import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UpdateStatus, UpdateStatusState, UpdateStepKey } from "@/lib/update-status";

// Statusdatei des Update-Skripts. Liegt auf der Platte, damit der Fortschritt
// den pm2-Neustart und ein Neuladen der Seite übersteht. Pfad identisch zu
// dem, was scripts/auto-update.sh schreibt ($PROJECT_DIR/logs/update-status.json).
export const UPDATE_STATUS_FILE = path.join(
  process.cwd(),
  "logs",
  "update-status.json",
);

/** Liest den aktuellen Update-Status (oder null, wenn keiner vorliegt). */
export async function readUpdateStatus(): Promise<UpdateStatus | null> {
  try {
    const raw = await readFile(UPDATE_STATUS_FILE, "utf8");
    const data = JSON.parse(raw) as Partial<UpdateStatus>;
    if (!data || typeof data.state !== "string") return null;
    return {
      state: data.state as UpdateStatusState,
      step: (data.step as UpdateStepKey) ?? "start",
      startedAt: data.startedAt ?? null,
      updatedAt: data.updatedAt ?? null,
      fromSha: data.fromSha ?? null,
      toSha: data.toSha ?? null,
      message: typeof data.message === "string" ? data.message : "",
      error: typeof data.error === "string" ? data.error : "",
    };
  } catch {
    // Datei fehlt / unlesbar / kaputtes JSON -> kein Status.
    return null;
  }
}

/** Schreibt einen Update-Status (atomar via temp + rename). */
export async function writeUpdateStatus(status: UpdateStatus): Promise<void> {
  await mkdir(path.dirname(UPDATE_STATUS_FILE), { recursive: true });
  const tmp = `${UPDATE_STATUS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(status, null, 2), "utf8");
  // rename ist atomar – Leser sehen nie eine halb geschriebene Datei.
  await rename(tmp, UPDATE_STATUS_FILE);
}
