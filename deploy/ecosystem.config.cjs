// Processus PM2 de l'API (qui sert aussi web/dist). `pm2 reload` redémarre sans coupure.
module.exports = {
  apps: [
    {
      name: "naja7school",
      cwd: __dirname + "/../server",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production" },
      max_memory_restart: "700M",
      time: true,
    },
  ],
};
