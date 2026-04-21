# Changelog

## [Unreleased] - yyyy-mm-dd

- fix(registry): restore npm package visibility

## [1.0.1] - 2026-04-21

- Fix CI: align npm publish workflow with `node-hmac-auth` (tag-driven GitHub Actions publish path).
- Fix CI: synchronize `package-lock.json` for deterministic `npm ci`.

## [1.0.0] - 2026-04-20

- Fix: enforce `require`-based local job loading pattern aligned with the starter-template behavior.
- Docs: clarify service location (`src/services/cron.service.ts`) and jobs location (`src/cron/jobs`) with `jobsDir: join(__dirname, "../cron/jobs")`.
- Docs: simplify bootstrap usage to `await cronService.start()`.
- Chore: add `poc/` minimal Express app with `pnpm dev` (nodemon), `pnpm build`, service wiring, and a boot + every-minute heartbeat cron job.

## 0.1.0

- Initial release of the framework-agnostic cron scheduler.
