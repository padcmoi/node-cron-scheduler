import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, relative, resolve } from "node:path";
import type { CronRunner } from "./scheduler";
import { hh as toHour, jj as toDayOfMonth, mm as toMinute } from "./schema";
import type { CronLine, CronLoadJobsOptions, CronModule } from "./types";

const DEFAULT_EXTENSIONS = [".js", ".cjs", ".ts", ".cts"];

function normalizeExtensions(fileExtensions: string[] | undefined) {
  const source = fileExtensions && fileExtensions.length > 0 ? fileExtensions : DEFAULT_EXTENSIONS;
  return source.map((item) => (item.startsWith(".") ? item.toLowerCase() : `.${item.toLowerCase()}`));
}

function isObjectLike(value: unknown) {
  return typeof value === "object" && value !== null;
}

function normalizeMinute(value: unknown) {
  if (value === "*") return "*";
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 59) return null;
  return toMinute(value);
}

function normalizeHour(value: unknown) {
  if (value === "*") return "*";
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 23) return null;
  return toHour(value);
}

function normalizeDayOfMonth(value: unknown) {
  if (value === "*") return "*";
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 31) return null;
  return toDayOfMonth(value);
}

function normalizeMonth(value: unknown) {
  if (value === "*") return "*";
  if (value === "january") return "january";
  if (value === "february") return "february";
  if (value === "march") return "march";
  if (value === "april") return "april";
  if (value === "may") return "may";
  if (value === "june") return "june";
  if (value === "july") return "july";
  if (value === "august") return "august";
  if (value === "september") return "september";
  if (value === "october") return "october";
  if (value === "november") return "november";
  if (value === "december") return "december";
  return null;
}

function normalizeDayOfWeek(value: unknown) {
  if (value === "*") return "*";
  if (value === "sunday") return "sunday";
  if (value === "monday") return "monday";
  if (value === "tuesday") return "tuesday";
  if (value === "wednesday") return "wednesday";
  if (value === "thursday") return "thursday";
  if (value === "friday") return "friday";
  if (value === "saturday") return "saturday";
  return null;
}

function normalizeCronLine(line: unknown) {
  if (!isObjectLike(line)) return null;
  if (!("mm" in line) || !("hh" in line) || !("jj" in line) || !("MMM" in line) || !("JJJ" in line)) return null;

  const mm = normalizeMinute(line.mm);
  const hh = normalizeHour(line.hh);
  const jj = normalizeDayOfMonth(line.jj);
  const MMM = normalizeMonth(line.MMM);
  const JJJ = normalizeDayOfWeek(line.JJJ);

  if (mm === null || hh === null || jj === null || MMM === null || JJJ === null) return null;

  return {
    mm,
    hh,
    jj,
    MMM,
    JJJ,
  } satisfies CronLine;
}

function extractCronModule(value: unknown) {
  if (!isObjectLike(value)) return null;
  if (!("config" in value) || !("run" in value)) return null;

  if (typeof value.run !== "function") return null;
  if (!isObjectLike(value.config)) return null;
  if (!("atBoot" in value.config) || !("lines" in value.config)) return null;
  if (typeof value.config.atBoot !== "boolean") return null;
  if (!Array.isArray(value.config.lines)) return null;

  const lines: CronLine[] = [];
  for (const line of value.config.lines) {
    const normalized = normalizeCronLine(line);
    if (!normalized) return null;
    lines.push(normalized);
  }

  const allowOverlap = "allowOverlap" in value ? value.allowOverlap : undefined;
  if (allowOverlap !== undefined && typeof allowOverlap !== "boolean") return null;

  const runImpl = value.run;

  return {
    config: {
      atBoot: value.config.atBoot,
      lines,
    },
    run: async (context) => {
      await Reflect.apply(runImpl, value, [context]);
    },
    ...(allowOverlap === undefined ? {} : { allowOverlap }),
  } satisfies CronModule;
}

function pickCronModule(imported: unknown) {
  const direct = extractCronModule(imported);
  if (direct) return direct;

  if (isObjectLike(imported) && "default" in imported) {
    return extractCronModule(imported.default);
  }

  return null;
}

async function listJobFiles(baseDir: string, recursive: boolean, extensions: string[]) {
  const out: string[] = [];

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      if (entry.name.endsWith(".d.ts")) continue;

      const extension = extname(entry.name).toLowerCase();
      if (!extensions.includes(extension)) continue;

      out.push(fullPath);
    }
  };

  await walk(baseDir);

  return out.sort();
}

function toTaskId(jobsDir: string, filePath: string, extensions: string[]) {
  const rel = relative(jobsDir, filePath).split("\\").join("/");

  for (const extension of extensions) {
    if (rel.toLowerCase().endsWith(extension)) {
      return rel.slice(0, rel.length - extension.length);
    }
  }

  return rel;
}

export async function loadCronJobsFromDirectory(runner: CronRunner, options: CronLoadJobsOptions) {
  const extensions = normalizeExtensions(options.fileExtensions);
  const recursive = options.recursive ?? false;
  const missingDirectoryBehavior = options.missingDirectoryBehavior ?? "warn";
  const logger = options.logger;
  const resolvedJobsDir = resolve(options.jobsDir);
  const loadJobWithRequire = createRequire(join(resolvedJobsDir, "__cron_loader__.cjs"));

  if (!existsSync(resolvedJobsDir)) {
    const message = `[CRON] jobs directory not found: ${options.jobsDir}`;

    if (missingDirectoryBehavior === "error") {
      throw new Error(message);
    }

    if (missingDirectoryBehavior === "warn") {
      logger?.warn?.(message);
    }

    return { loaded: 0, skipped: 0, files: [] };
  }

  const files = await listJobFiles(resolvedJobsDir, recursive, extensions);
  if (files.length === 0) {
    return { loaded: 0, skipped: 0, files: [] };
  }

  let loaded = 0;
  let skipped = 0;
  const loadedFiles: string[] = [];

  for (const filePath of files) {
    let imported: unknown;
    const relativeFile = relative(resolvedJobsDir, filePath).split("\\").join("/");

    try {
      imported = loadJobWithRequire(`./${relativeFile}`);
    } catch (error) {
      skipped += 1;
      logger?.warn?.("[CRON] failed to require job file", { filePath, error });
      continue;
    }

    const cronModule = pickCronModule(imported);
    if (!cronModule) {
      skipped += 1;
      logger?.warn?.("[CRON] skipped invalid job module", { filePath });
      continue;
    }

    const taskId = toTaskId(resolvedJobsDir, filePath, extensions);
    runner.register(taskId, cronModule);

    loaded += 1;
    loadedFiles.push(filePath);
  }

  return { loaded, skipped, files: loadedFiles };
}
