import { join } from "node:path";
import { CronService } from "@naskot/node-cron-scheduler";

export const cronService = new CronService({
  jobsDir: join(__dirname, "../cron/jobs"),
  recursive: false,
  missingDirectoryBehavior: "warn",
  logger: {
    info: (message, meta) => console.info(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
  },
});
