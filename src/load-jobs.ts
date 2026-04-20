import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import type { CronRunner } from "./scheduler";
import type { CronLoadJobsOptions, CronLoadJobsResult, CronModule } from "./types";

const DEFAULT_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"];

function normalizeExtensions(fileExtensions: string[] | undefined) {
  const source = fileExtensions && fileExtensions.length > 0 ? fileExtensions : DEFAULT_EXTENSIONS;
  return source.map((item) => (item.startsWith(".") ? item.toLowerCase() : `.${item.toLowerCase()}`));
}

function isCronModule(value: unknown): value is CronModule {
  if (typeof value !== "object" || value === null) return false;
  const maybe = value as Partial<CronModule>;
  return Boolean(maybe.config && Array.isArray(maybe.config.lines) && typeof maybe.run === "function");
}

function pickCronModule(imported: unknown): CronModule | null {
  if (isCronModule(imported)) return imported;

  if (typeof imported === "object" && imported !== null && "default" in imported) {
    const candidate = (imported as { default: unknown }).default;
    if (isCronModule(candidate)) return candidate;
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

export async function loadCronJobsFromDirectory(runner: CronRunner, options: CronLoadJobsOptions): Promise<CronLoadJobsResult> {
  const extensions = normalizeExtensions(options.fileExtensions);
  const recursive = options.recursive ?? false;
  const missingDirectoryBehavior = options.missingDirectoryBehavior ?? "warn";
  const logger = options.logger;

  if (!existsSync(options.jobsDir)) {
    const message = `[CRON] jobs directory not found: ${options.jobsDir}`;

    if (missingDirectoryBehavior === "error") {
      throw new Error(message);
    }

    if (missingDirectoryBehavior === "warn") {
      logger?.warn?.(message);
    }

    return { loaded: 0, skipped: 0, files: [] };
  }

  const files = await listJobFiles(options.jobsDir, recursive, extensions);
  if (files.length === 0) {
    return { loaded: 0, skipped: 0, files: [] };
  }

  let loaded = 0;
  let skipped = 0;
  const loadedFiles: string[] = [];

  for (const filePath of files) {
    let imported: unknown;

    try {
      imported = await import(pathToFileURL(filePath).href);
    } catch (error) {
      skipped += 1;
      logger?.warn?.("[CRON] failed to import job file", { filePath, error });
      continue;
    }

    const cronModule = pickCronModule(imported);
    if (!cronModule) {
      skipped += 1;
      logger?.warn?.("[CRON] skipped invalid job module", { filePath });
      continue;
    }

    const taskId = toTaskId(options.jobsDir, filePath, extensions);
    runner.register(taskId, cronModule);

    loaded += 1;
    loadedFiles.push(filePath);
  }

  return { loaded, skipped, files: loadedFiles };
}
