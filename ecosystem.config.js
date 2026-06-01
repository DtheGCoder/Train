// PM2-Konfiguration für Train (Next.js, Produktion).
// Start:    pm2 start ecosystem.config.js
// Neuladen: pm2 reload ecosystem.config.js
// Logs:     pm2 logs train
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
      },
      // Logs
      time: true,
      out_file: "./logs/train-out.log",
      error_file: "./logs/train-error.log",
      merge_logs: true,
    },
  ],
};
