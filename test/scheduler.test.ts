import { afterEach, describe, expect, it, vi } from "vitest";
import { computeNextRunAt, CronRunner } from "../src/scheduler";
import type { CronLine } from "../src/types";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("computeNextRunAt", () => {
  it("computes the next run minute from a fixed date", () => {
    const lines: CronLine[] = [{ mm: 15, hh: 8, jj: "*", MMM: "*", JJJ: "*" }];

    const now = new Date(2026, 0, 1, 8, 10, 32, 0);
    const next = computeNextRunAt(lines, now);

    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(8);
    expect(next.getMinutes()).toBe(15);
    expect(next.getSeconds()).toBe(0);
  });

  it("moves to next matching day when minute is already passed", () => {
    const lines: CronLine[] = [{ mm: 15, hh: 8, jj: "*", MMM: "*", JJJ: "*" }];

    const now = new Date(2026, 0, 1, 8, 15, 32, 0);
    const next = computeNextRunAt(lines, now);

    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(2);
    expect(next.getHours()).toBe(8);
    expect(next.getMinutes()).toBe(15);
    expect(next.getSeconds()).toBe(0);
  });
});

describe("CronRunner", () => {
  it("skips overlap by default", async () => {
    const runner = new CronRunner();

    let runCount = 0;
    let running = 0;
    let maxParallel = 0;

    runner.register("job", {
      config: {
        atBoot: false,
        lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
      },
      run: async () => {
        runCount += 1;
        running += 1;
        maxParallel = Math.max(maxParallel, running);
        await new Promise((resolve) => setTimeout(resolve, 20));
        running -= 1;
      },
    });

    const p1 = runner.trigger("job");
    const p2 = runner.trigger("job");

    await Promise.all([p1, p2]);

    expect(runCount).toBe(1);
    expect(maxParallel).toBe(1);
  });

  it("allows overlap when explicitly enabled", async () => {
    const runner = new CronRunner();

    let runCount = 0;
    let running = 0;
    let maxParallel = 0;

    runner.register("job", {
      config: {
        atBoot: false,
        lines: [{ mm: "*", hh: "*", jj: "*", MMM: "*", JJJ: "*" }],
      },
      allowOverlap: true,
      run: async () => {
        runCount += 1;
        running += 1;
        maxParallel = Math.max(maxParallel, running);
        await new Promise((resolve) => setTimeout(resolve, 20));
        running -= 1;
      },
    });

    const p1 = runner.trigger("job");
    const p2 = runner.trigger("job");

    await Promise.all([p1, p2]);

    expect(runCount).toBe(2);
    expect(maxParallel).toBe(2);
  });

  it("runs atBoot once after scheduler start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));

    const runner = new CronRunner({ atBootDelayMs: 10 });

    let runCount = 0;

    runner.register("boot", {
      config: {
        atBoot: true,
        lines: [{ mm: 0, hh: 0, jj: "*", MMM: "*", JJJ: "*" }],
      },
      run: () => {
        runCount += 1;
      },
    });

    runner.start();
    await vi.advanceTimersByTimeAsync(15);

    expect(runCount).toBe(1);

    runner.stop();
  });
});
