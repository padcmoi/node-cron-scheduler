import express from "express";
import { cronService } from "./services/cron.service";

async function bootstrap() {
  await cronService.start();

  const app = express();
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0, () => {
    console.info("Proof Of Concept started");
  });

  const shutdown = () => {
    cronService.stop();
    server.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
