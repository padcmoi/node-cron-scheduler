import type {
  BaseNoDay,
  BaseNoHour,
  BaseNoMinute,
  CronLine,
  DayOfMonth,
  DayOfWeek,
  Hour,
  Minute,
  Month,
  NumericToken,
} from "./types";

const MONTHS: Record<Exclude<Month, "*">, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const DOWS: Record<Exclude<DayOfWeek, "*">, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function monthToNumber(m: Month) {
  if (m === "*") return null;
  return MONTHS[m];
}

export function dayOfWeekToNumber(d: DayOfWeek) {
  if (d === "*") return null;
  return DOWS[d];
}

export function numberOrNull(v: NumericToken) {
  if (v === "*") return null;
  return Number(v);
}

export function assertRange(name: string, v: number | null, min: number, max: number) {
  if (v === null) return;
  if (v < min || v > max) {
    throw new Error(`${name} out of range (${min}-${max}): ${v}`);
  }
}

function assertIntInRange(name: string, v: number, min: number, max: number) {
  if (!Number.isFinite(v) || !Number.isInteger(v)) {
    throw new Error(`${name} must be an integer: ${v}`);
  }
  if (v < min || v > max) {
    throw new Error(`${name} out of range (${min}-${max}): ${v}`);
  }
}

export function mm(v: number): Minute {
  assertIntInRange("minute", v, 0, 59);
  return v as Minute;
}

export function hh(v: number): Hour {
  assertIntInRange("hour", v, 0, 23);
  return v as Hour;
}

export function jj(v: number): DayOfMonth {
  assertIntInRange("dayOfMonth", v, 1, 31);
  return v as DayOfMonth;
}

function assertStep(name: string, step: number, max: number) {
  if (!Number.isFinite(step) || !Number.isInteger(step)) {
    throw new Error(`${name} step must be an integer: ${step}`);
  }
  if (step <= 0) {
    throw new Error(`${name} step must be > 0: ${step}`);
  }
  if (step > max) {
    throw new Error(`${name} step must be <= ${max}: ${step}`);
  }
}

function assertStart(name: string, start: number, min: number, max: number) {
  if (!Number.isFinite(start) || !Number.isInteger(start)) {
    throw new Error(`${name} start must be an integer: ${start}`);
  }
  if (start < min || start > max) {
    throw new Error(`${name} start out of range (${min}-${max}): ${start}`);
  }
}

export function everyMinutes(step: number, base: BaseNoMinute & { hh: Hour }, start = 0) {
  assertStep("minute", step, 59);
  assertStart("minute", start, 0, 59);

  const out: CronLine[] = [];
  for (let m = start; m <= 59; m += step) {
    out.push({ ...base, mm: mm(m) });
  }
  return out satisfies CronLine[];
}

export function everyHours(step: number, base: BaseNoHour & { mm: Minute }, start = 0) {
  assertStep("hour", step, 23);
  assertStart("hour", start, 0, 23);

  const out: CronLine[] = [];
  for (let h = start; h <= 23; h += step) {
    out.push({ ...base, hh: hh(h) });
  }
  return out satisfies CronLine[];
}

export function everyDaysOfMonth(step: number, base: BaseNoDay & { mm: Minute; hh: Hour }, start = 1) {
  assertStep("dayOfMonth", step, 31);
  assertStart("dayOfMonth", start, 1, 31);

  const out: CronLine[] = [];
  for (let d = start; d <= 31; d += step) {
    out.push({ ...base, jj: jj(d) });
  }
  return out satisfies CronLine[];
}
