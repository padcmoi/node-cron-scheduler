import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadCronJobsFromDirectory } from "../src/load-jobs";
import { CronRunner } from "../src/scheduler";
import { CronService } from "../src/service";

const temporaryDirs: string[] = [];

afterEach(async () => {
  for (const dir of temporaryDirs.splice(0, temporaryDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function createTempJobsDir() {
  const dir = await mkdtemp(join(tmpdir(), "cron-jobs-"));
  temporaryDirs.push(dir);
  return dir;
}

describe("loadCronJobsFromDirectory", () => {
  it("loads valid modules and skips invalid ones", async () => {
    const jobsDir = await createTempJobsDir();

    await writeFile(
      join(jobsDir, "alpha.cjs"),
      `module.exports = { config: { atBoot: false, lines: [{ mm: 0, hh: 8, jj: '*', MMM: '*', JJJ: '*' }] }, run: () => {} };\n`
    );

    await writeFile(join(jobsDir, "invalid.cjs"), `module.exports = { nope: true };\n`);

    await mkdir(join(jobsDir, "nested"));
    await writeFile(
      join(jobsDir, "nested", "beta.cjs"),
      `module.exports = { default: { config: { atBoot: true, lines: [{ mm: 30, hh: 12, jj: '*', MMM: '*', JJJ: '*' }] }, run: () => {} } };\n`
    );

    const runner = new CronRunner();
    const result = await loadCronJobsFromDirectory(runner, {
      jobsDir,
      recursive: true,
      fileExtensions: [".cjs"],
    });

    expect(result.loaded).toBe(2);
    expect(result.skipped).toBe(1);
    expect(runner.listTaskIds()).toEqual(["alpha", "nested/beta"]);
  });

  it("returns zero when directory does not exist", async () => {
    const runner = new CronRunner();
    const result = await loadCronJobsFromDirectory(runner, {
      jobsDir: "/tmp/cron-jobs-that-do-not-exist",
      missingDirectoryBehavior: "ignore",
    });

    expect(result).toEqual({ loaded: 0, skipped: 0, files: [] });
  });

  it("throws when missingDirectoryBehavior is error", async () => {
    const runner = new CronRunner();

    await expect(
      loadCronJobsFromDirectory(runner, {
        jobsDir: "/tmp/cron-jobs-that-do-not-exist",
        missingDirectoryBehavior: "error",
      })
    ).rejects.toThrow(/jobs directory not found/i);
  });
});

describe("CronService", () => {
  it("loads jobs from jobsDir on start", async () => {
    const jobsDir = await createTempJobsDir();

    await writeFile(
      join(jobsDir, "cleanup.cjs"),
      `module.exports = { config: { atBoot: false, lines: [{ mm: 0, hh: '*', jj: '*', MMM: '*', JJJ: '*' }] }, run: () => {} };\n`
    );

    const service = new CronService({
      jobsDir,
      fileExtensions: [".cjs"],
      missingDirectoryBehavior: "error",
    });

    const firstStart = await service.start();
    const secondStart = await service.start();

    expect(firstStart.loaded).toBe(1);
    expect(firstStart.message).toContain("started");
    expect(secondStart.loaded).toBe(0);
    expect(secondStart.message).toContain("already started");

    service.stop();
  });
});
