# Changelog

## [Unreleased] - yyyy-mm-dd

- Fix: enforce `require`-based local job loading pattern aligned with the starter-template behavior.
- Docs: clarify service location (`src/services/cron.service.ts`) and jobs location (`src/cron/jobs`) with `jobsDir: join(__dirname, "../cron/jobs")`.
- Docs: simplify bootstrap usage to `await cronService.start()`.
- Chore: add `poc/` minimal Express app with `pnpm dev` (nodemon), `pnpm build`, service wiring, and a boot + every-minute heartbeat cron job.

## 0.1.0

- Initial release of the framework-agnostic cron scheduler.
