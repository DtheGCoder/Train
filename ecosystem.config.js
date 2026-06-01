// PM2-Konfiguration für Train (Next.js, Produktion).
// Start:    pm2 start ecosystem.config.js
// Neuladen: pm2 reload ecosystem.config.js
// Logs:     pm2 logs train
const { execSync } = require("node:child_process");

// Aktuellen Commit ermitteln: bevorzugt die vom Deploy gesetzte Variable,
// sonst frisch aus git lesen. Diese Datei wird bei JEDEM
// `pm2 reload ecosystem.config.js --update-env` neu ausgewertet, daher zeigt
// die App nach einem Deploy/Update verlässlich den neuen Commit an.
function resolveGitCommit() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.trim();
  try {
    return execSync("git rev-parse HEAD", {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

module.exports = {
  apps: [
    {
      name: "train",
      // Next.js im Produktionsmodus starten (Build muss vorher erfolgt sein).
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        // Muss im env-Block stehen, sonst überschreibt --update-env den alten
        // (im pm2-Dump gespeicherten) Wert NICHT.
        GIT_COMMIT: resolveGitCommit(),
      },
      // Logs
      time: true,
      out_file: "./logs/train-out.log",
      error_file: "./logs/train-error.log",
      merge_logs: true,
    },
  ],
};
