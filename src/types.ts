export type Minute =
  | "*"
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59;

export type Hour =
  | "*"
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

export type DayOfMonth =
  | "*"
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

export type Month =
  | "*"
  | "january"
  | "february"
  | "march"
  | "april"
  | "may"
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december";

export type DayOfWeek = "*" | "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export type CronLine = {
  mm: Minute;
  hh: Hour;
  jj: DayOfMonth;
  MMM: Month;
  JJJ: DayOfWeek;
};

export interface CronSchema {
  atBoot: boolean;
  lines: CronLine[];
}

export type NumericToken = Minute | Hour | DayOfMonth;

export interface CronRunContext {
  taskId: string;
  triggeredAt: Date;
  scheduledAt: Date | null;
}

export type CronModule = {
  config: CronSchema;
  run: (context: CronRunContext) => Promise<void> | void;
  allowOverlap?: boolean;
};

export type CronTaskState = {
  running: boolean;
  timer: NodeJS.Timeout | null;
};

export type BaseNoMinute = Omit<CronLine, "mm">;
export type BaseNoHour = Omit<CronLine, "hh">;
export type BaseNoDay = Omit<CronLine, "jj">;

export interface CronLogger {
  info?: (message: string, meta?: unknown) => void;
  warn?: (message: string, meta?: unknown) => void;
  error?: (message: string, meta?: unknown) => void;
  debug?: (message: string, meta?: unknown) => void;
}

export interface CronRunnerOptions {
  logger?: CronLogger;
  atBootDelayMs?: number;
  now?: () => Date;
}

export interface CronLoadJobsOptions {
  jobsDir: string;
  recursive?: boolean;
  fileExtensions?: string[];
  missingDirectoryBehavior?: "warn" | "error" | "ignore";
  logger?: CronLogger;
}

export interface CronLoadJobsResult {
  loaded: number;
  skipped: number;
  files: string[];
}

export interface CronServiceOptions extends CronRunnerOptions, Omit<CronLoadJobsOptions, "jobsDir"> {
  jobsDir: string;
}
