import { assertRange, dayOfWeekToNumber, monthToNumber, numberOrNull } from "./schema";
import type { CronLine, CronLogger, CronModule, CronRunContext, CronRunnerOptions, CronTaskState } from "./types";

const MAX_SET_TIMEOUT_MS = 2_147_483_647;

const NOOP_LOGGER: Required<CronLogger> = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

export function matchesLine(line: CronLine, date: Date) {
  const mm = numberOrNull(line.mm);
  assertRange("minute", mm, 0, 59);

  const hh = numberOrNull(line.hh);
  assertRange("hour", hh, 0, 23);

  const jj = numberOrNull(line.jj);
  assertRange("dayOfMonth", jj, 1, 31);

  const MMM = monthToNumber(line.MMM);
  assertRange("month", MMM, 1, 12);

  const JJJ = dayOfWeekToNumber(line.JJJ);
  assertRange("dayOfWeek", JJJ, 0, 6);

  if (mm !== null && date.getMinutes() !== mm) return false;
  if (hh !== null && date.getHours() !== hh) return false;
  if (jj !== null && date.getDate() !== jj) return false;
  if (MMM !== null && date.getMonth() + 1 !== MMM) return false;
  if (JJJ !== null && date.getDay() !== JJJ) return false;

  return true;
}

export function computeNextRunAt(lines: CronLine[], from: Date) {
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const limit = 366 * 24 * 60;
  const cursor = new Date(start.getTime());

  for (let i = 0; i < limit; i++) {
    for (const line of lines) {
      if (matchesLine(line, cursor)) return new Date(cursor.getTime());
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  throw new Error("Unable to compute next cron run (search limit reached)");
}

function validateCronLines(lines: CronLine[]) {
  for (const line of lines) {
    const mm = numberOrNull(line.mm);
    assertRange("minute", mm, 0, 59);

    const hh = numberOrNull(line.hh);
    assertRange("hour", hh, 0, 23);

    const jj = numberOrNull(line.jj);
    assertRange("dayOfMonth", jj, 1, 31);

    const MMM = monthToNumber(line.MMM);
    assertRange("month", MMM, 1, 12);

    const JJJ = dayOfWeekToNumber(line.JJJ);
    assertRange("dayOfWeek", JJJ, 0, 6);
  }
}

export class CronRunner {
  private readonly tasks = new Map<string, CronModule>();
  private readonly states = new Map<string, CronTaskState>();
  private readonly bootRan = new Set<string>();
  private readonly bootTimers = new Map<string, NodeJS.Timeout | null>();

  private readonly logger: Required<CronLogger>;
  private readonly atBootDelayMs: number;
  private readonly now: () => Date;

  private started = false;

  constructor(options: CronRunnerOptions = {}) {
    this.logger = { ...NOOP_LOGGER, ...(options.logger ?? {}) };
    this.atBootDelayMs = options.atBootDelayMs ?? 250;
    this.now = options.now ?? (() => new Date());
  }

  register(taskId: string, mod: CronModule) {
    if (!taskId) throw new Error("Cron taskId is required");
    if (!mod?.config) throw new Error("CronModule must have a config");
    if (!Array.isArray(mod.config.lines) || mod.config.lines.length === 0) {
      throw new Error(`CronModule "${taskId}" must have at least one line`);
    }
    if (typeof mod.run !== "function") throw new Error(`CronModule "${taskId}" must have run()`);
    if (this.tasks.has(taskId)) throw new Error(`Cron task already registered: ${taskId}`);

    validateCronLines(mod.config.lines);

    this.tasks.set(taskId, mod);
    this.states.set(taskId, { running: false, timer: null });
    this.bootTimers.set(taskId, null);

    if (this.started) this.arm(taskId);
  }

  unregister(taskId: string) {
    const st = this.states.get(taskId);
    if (st?.timer) clearTimeout(st.timer);

    const bootTimer = this.bootTimers.get(taskId);
    if (bootTimer) clearTimeout(bootTimer);

    this.states.delete(taskId);
    this.bootTimers.delete(taskId);
    this.tasks.delete(taskId);
    this.bootRan.delete(taskId);
  }

  listTaskIds() {
    return [...this.tasks.keys()].sort();
  }

  start() {
    if (this.started) return `[CRON] already started (${this.tasks.size} task(s))`;

    this.started = true;
    for (const taskId of this.tasks.keys()) {
      this.arm(taskId);
    }

    const message = `[CRON] started (${this.tasks.size} task(s))`;
    this.logger.info(message);
    return message;
  }

  stop() {
    for (const st of this.states.values()) {
      if (st.timer) clearTimeout(st.timer);
      st.timer = null;
      st.running = false;
    }

    for (const timer of this.bootTimers.values()) {
      if (timer) clearTimeout(timer);
    }

    for (const taskId of this.bootTimers.keys()) {
      this.bootTimers.set(taskId, null);
    }

    this.started = false;
    this.logger.info("[CRON] stopped");
  }

  async trigger(taskId: string) {
    await this.execute(taskId, null);
  }

  private arm(taskId: string) {
    const task = this.tasks.get(taskId);
    const st = this.states.get(taskId);
    if (!task || !st) return;

    if (st.timer) clearTimeout(st.timer);

    if (task.config.atBoot && !this.bootRan.has(taskId)) {
      this.bootRan.add(taskId);
      const bootTimer = setTimeout(() => {
        void this.execute(taskId, null);
      }, this.atBootDelayMs);
      this.bootTimers.set(taskId, bootTimer);
    }

    const now = this.now();
    const next = computeNextRunAt(task.config.lines, now);
    const delay = Math.max(0, next.getTime() - now.getTime());

    if (delay > MAX_SET_TIMEOUT_MS) {
      st.timer = setTimeout(() => this.arm(taskId), MAX_SET_TIMEOUT_MS);
      this.logger.debug("[CRON] scheduled chunk", {
        taskId,
        chunkUntil: new Date(now.getTime() + MAX_SET_TIMEOUT_MS).toISOString(),
        target: next.toISOString(),
      });
      return;
    }

    st.timer = setTimeout(() => {
      void this.execute(taskId, next).finally(() => this.arm(taskId));
    }, delay);

    this.logger.info("[CRON] scheduled", { taskId, next: next.toISOString() });
  }

  private async execute(taskId: string, scheduledAt: Date | null) {
    const task = this.tasks.get(taskId);
    const st = this.states.get(taskId);
    if (!task || !st) return;

    if (st.running && task.allowOverlap !== true) {
      this.logger.warn("[CRON] skip (already running)", { taskId });
      return;
    }

    const context: CronRunContext = {
      taskId,
      triggeredAt: this.now(),
      scheduledAt,
    };

    st.running = true;
    try {
      await task.run(context);
      this.logger.info("[CRON] done", { taskId });
    } catch (error) {
      this.logger.error("[CRON] failed", { taskId, error });
    } finally {
      st.running = false;
    }
  }
}
