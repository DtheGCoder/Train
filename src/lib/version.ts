import { execSync } from "node:child_process";

// GitHub-Repository für Versionsanzeige / Auto-Update.
export const GITHUB_OWNER = "DtheGCoder";
export const GITHUB_REPO = "Train";
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

export type GithubCommit = {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type VersionInfo = {
  currentSha: string | null;
  currentShortSha: string | null;
  latest: GithubCommit | null;
  upToDate: boolean | null;
  error?: string;
};

/** Aktueller Git-Commit der laufenden Instanz (Build- oder Laufzeit). */
export function getCurrentCommit(): string | null {
  // Bevorzugt eine bei Build/Deploy gesetzte Variable (kein git nötig).
  const fromEnv = process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT;
  if (fromEnv) return fromEnv.trim();
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Neuesten Commit des Default-Branches via GitHub-API holen (ohne Token). */
export async function getLatestCommit(): Promise<GithubCommit | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "train-app",
        },
        // Alle 5 Minuten neu prüfen.
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      sha: string;
      html_url: string;
      commit: {
        message: string;
        author: { name: string; date: string };
      };
    }>;
    const c = data[0];
    if (!c) return null;
    return {
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name ?? "unbekannt",
      date: c.commit.author?.date ?? "",
      url: c.html_url,
    };
  } catch {
    return null;
  }
}

export async function getVersionInfo(): Promise<VersionInfo> {
  const currentSha = getCurrentCommit();
  const latest = await getLatestCommit();
  const upToDate =
    currentSha && latest ? currentSha === latest.sha : latest ? null : null;
  return {
    currentSha,
    currentShortSha: currentSha ? currentSha.slice(0, 7) : null,
    latest,
    upToDate,
    error: latest ? undefined : "GitHub-Version konnte nicht geladen werden.",
  };
}
