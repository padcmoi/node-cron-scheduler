# node-cron-scheduler

Framework-agnostic cron scheduler for Node.js.

- Linux-like minute scheduling (`mm hh jj MMM JJJ`)
- In-process runner
- Job auto-loading from a directory you provide
- No Express dependency

## Install

```bash
npm install @naskot/node-cron-scheduler
```

## Quick Start

### 1) Keep jobs in your app (not in the package)

Example tree in your API project:

```txt
src/
  cron/
    jobs/
      audits-purge.job.ts
      rabbitmq-cleanup.job.ts
```

Each job must export a `CronModule` (default export recommended):

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const mod: CronModule = {
  config: {
    atBoot: false,
    lines: [{ mm: 0, hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: async () => {
    // call your service here
  },
};

export default mod;
```

### 2) Wire it in your `*.service.ts`

```ts
// src/cron/index.ts
import { join } from "node:path";
import { CronService } from "@naskot/node-cron-scheduler";

const jobsDir = join(__dirname, "jobs");

export const cronService = new CronService({
  jobsDir, // same pattern as: require(`./jobs/${file}`)
  recursive: false,
  missingDirectoryBehavior: "warn",
  logger: {
    info: (message, meta) => console.info(message, meta),
    warn: (message, meta) => console.warn(message, meta),
    error: (message, meta) => console.error(message, meta),
  },
});

export async function startCron() {
  return cronService.start();
}

export function stopCron() {
  cronService.stop();
}
```

### 3) Start from bootstrap/init

```ts
await startCron();
```

## Typed Helpers

Use helpers to build lines safely:

```ts
import { everyHours, hh, mm } from "@naskot/node-cron-scheduler";

const lines = [
  { mm: mm(0), hh: hh(8), jj: "*", MMM: "*", JJJ: "*" },
  ...everyHours(6, { mm: 0, jj: "*", MMM: "*", JJJ: "*" }),
];
```

## API

- `CronRunner`: low-level scheduler (manual registration)
- `loadCronJobsFromDirectory(runner, options)`: scan/require/register jobs from a folder
- `CronService`: high-level wrapper that receives `jobsDir` and auto-loads on `start()`

## Notes

- The scheduler uses the Node.js process timezone.
- Recommended pattern: keep the cron bootstrap file next to `jobs/`, then use `join(__dirname, "jobs")`.
- Jobs are loaded with `require`, exactly in the original starter template spirit.
- Keep business logic in dedicated domain services; jobs should orchestrate calls only.
