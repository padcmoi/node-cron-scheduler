import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: true,
    lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: () => {
    console.info(`Ok cron it's work / (${Date()})`);
  },
} satisfies CronModule;

export default job;
