# node-cron-scheduler

Node.js cron scheduler.

- Linux-like minute scheduling (`mm hh jj MMM JJJ`)
- In-process runner
- Auto-loading jobs from your own directory
- No Express dependency

## Install

```bash
npm install @naskot/node-cron-scheduler
```

## Official Documentation

- How-to usage + full API reference: [docs/helpers.md](./docs/helpers.md)

## Quick Start

### 1) Keep jobs in your app (not in the package)

Example tree in your API project:

```txt
src/
  services/
    cron.service.ts
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

### 2) Write it in your `src/services/cron.service.ts`

```ts
import { join } from "node:path";
import { CronService } from "@naskot/node-cron-scheduler";

export const cronService = new CronService({
  jobsDir: join(__dirname, "../cron/jobs"),
  recursive: false,
  missingDirectoryBehavior: "warn",
  logger: {
    info: (message, meta) => console.info(message, meta),
    warn: (message, meta) => console.warn(message, meta),
    error: (message, meta) => console.error(message, meta),
  },
});
```

### 3) Start from bootstrap/init

Call this when your app/API is starting as a singleton.

```ts
await cronService.start();
```

### 4) Documentation

How-to guide (usage documentation):

- [docs/helpers.md](./docs/helpers.md) - complete guide on how to use helpers and APIs.

## API

- `CronRunner`: low-level scheduler (manual registration)
- `loadCronJobsFromDirectory(runner, options)`: scan/require/register jobs from a folder
- `CronService`: high-level wrapper that receives `jobsDir` and auto-loads on `start()`

## Notes

- The scheduler uses the Node.js process timezone.
- Recommended pattern: keep the service in `src/services/cron.service.ts` and jobs in `src/cron/jobs`, then use `join(__dirname, "../cron/jobs")`.
- Jobs are loaded with `require`, exactly in the original starter template spirit.
- Keep business logic in dedicated domain services; jobs should orchestrate calls only.
