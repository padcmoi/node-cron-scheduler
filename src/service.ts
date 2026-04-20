import { loadCronJobsFromDirectory } from "./load-jobs";
import { CronRunner } from "./scheduler";
import type { CronLoadJobsResult, CronServiceOptions } from "./types";

export class CronService {
  readonly runner: CronRunner;

  private readonly jobsDir: string;
  private readonly recursive: boolean;
  private readonly fileExtensions: string[] | undefined;
  private readonly missingDirectoryBehavior: "warn" | "error" | "ignore";
  private readonly logger: CronServiceOptions["logger"];

  private jobsLoaded = false;

  constructor(options: CronServiceOptions) {
    this.runner = new CronRunner(options);
    this.jobsDir = options.jobsDir;
    this.recursive = options.recursive ?? false;
    this.fileExtensions = options.fileExtensions;
    this.missingDirectoryBehavior = options.missingDirectoryBehavior ?? "warn";
    this.logger = options.logger;
  }

  async loadJobs(force = false): Promise<CronLoadJobsResult> {
    if (force) {
      for (const taskId of this.runner.listTaskIds()) {
        this.runner.unregister(taskId);
      }
      this.jobsLoaded = false;
    }

    if (this.jobsLoaded && !force) {
      return { loaded: 0, skipped: 0, files: [] };
    }

    const result = await loadCronJobsFromDirectory(this.runner, {
      jobsDir: this.jobsDir,
      recursive: this.recursive,
      fileExtensions: this.fileExtensions,
      missingDirectoryBehavior: this.missingDirectoryBehavior,
      logger: this.logger,
    });

    this.jobsLoaded = true;
    return result;
  }

  async start() {
    const loaded = await this.loadJobs();
    const message = this.runner.start();
    return { ...loaded, message };
  }

  stop() {
    this.runner.stop();
  }
}
