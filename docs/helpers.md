# Jobs & Helpers Reference

Official usage guide for this package.

## 1) Service Setup (Primary)

This is the main integration path and should be your default.

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

await cronService.start();
```

`CronService` methods:

- `loadJobs(force?)`
- `start()`
- `stop()`

## 2) Job Files

Recommended structure:

```txt
src/
  services/
    cron.service.ts
  cron/
    jobs/
      heartbeat.job.ts
      cleanup.job.ts
```

### Canonical Job Template

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: async (context) => {
    console.info("run", context.taskId, context.triggeredAt.toISOString());
  },
} satisfies CronModule;

export default job;
```

### Job Templates By Use Case

#### Boot + Every Minute

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: true,
    lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: () => {
    console.info("OK");
  },
} satisfies CronModule;

export default job;
```

#### Every Hour At Minute 15

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [{ mm: 15, hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: () => {
    console.info("run every hour at minute 15");
  },
} satisfies CronModule;

export default job;
```

#### Every Day At 08:00

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [{ mm: 0, hh: 8, jj: "*", MMM: "*", JJJ: "*" }],
  },
  run: () => {
    console.info("run daily at 08:00");
  },
} satisfies CronModule;

export default job;
```

#### Multiple Schedules In One Job

`lines` works as OR logic: if one line matches, the job runs.

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [
      { mm: 0, hh: 8, jj: "*", MMM: "*", JJJ: "*" },
      { mm: 0, hh: 20, jj: "*", MMM: "*", JJJ: "*" },
    ],
  },
  run: () => {
    console.info("run twice a day");
  },
} satisfies CronModule;

export default job;
```

#### Allow Overlap

By default overlap is blocked. Enable it explicitly if you need concurrent runs.

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
  },
  allowOverlap: true,
  run: async () => {
    console.info("overlap enabled");
  },
} satisfies CronModule;

export default job;
```

## 3) Helpers That Save Time

### Typed Numeric Helpers

- `mm(value)` minute `0..59`
- `hh(value)` hour `0..23`
- `jj(value)` day of month `1..31`

### Expansion Helpers

- `everyMinutes(step, base, start?)`
- `everyHours(step, base, start?)`
- `everyDaysOfMonth(step, base, start?)`

Example: every 15 minutes.

```ts
import type { CronModule } from "@naskot/node-cron-scheduler";
import { everyMinutes } from "@naskot/node-cron-scheduler";

const job = {
  config: {
    atBoot: false,
    lines: [...everyMinutes(15, { hh: "*", jj: "*", MMM: "*", JJJ: "*" })],
  },
  run: () => {
    console.info("run every 15 minutes");
  },
} satisfies CronModule;

export default job;
```

Example: mixed rules with helpers.

```ts
import { everyHours, hh, mm } from "@naskot/node-cron-scheduler";

const lines = [
  { mm: mm(0), hh: hh(8), jj: "*", MMM: "*", JJJ: "*" },
  ...everyHours(6, { mm: 0, jj: "*", MMM: "*", JJJ: "*" }),
];
```

### Utility Helpers

- `monthToNumber(month)`
- `dayOfWeekToNumber(day)`
- `numberOrNull(token)`
- `assertRange(name, value, min, max)`

## 4) Types & Other Usage Modes

### Exported Types

- `CronLine`, `CronSchema`, `CronModule`
- `CronRunContext`
- `CronRunnerOptions`, `CronServiceOptions`, `CronLoadJobsOptions`, `CronLoadJobsResult`
- `CronLogger`
- `Minute`, `Hour`, `DayOfMonth`, `Month`, `DayOfWeek`
- `BaseNoMinute`, `BaseNoHour`, `BaseNoDay`

### Other Usage Modes

When you need lower-level control than `CronService`:

- `loadCronJobsFromDirectory(runner, options)`
- `CronRunner.register(taskId, module)`
- `CronRunner.unregister(taskId)`
- `CronRunner.listTaskIds()`
- `CronRunner.start()`
- `CronRunner.stop()`
- `CronRunner.trigger(taskId)`

Low-level scheduling primitives:

- `matchesLine(line, date)`
- `computeNextRunAt(lines, from)`

## Notes

- Jobs are loaded with `require`.
- Keep business logic in domain services, and keep jobs orchestration-focused.
