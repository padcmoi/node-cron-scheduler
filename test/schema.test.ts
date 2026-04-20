import { describe, expect, it } from "vitest";
import { everyDaysOfMonth, everyHours, everyMinutes, hh, jj, mm } from "../src/schema";

describe("schema helpers", () => {
  it("validates mm/hh/jj boundaries", () => {
    expect(mm(0)).toBe(0);
    expect(mm(59)).toBe(59);

    expect(hh(0)).toBe(0);
    expect(hh(23)).toBe(23);

    expect(jj(1)).toBe(1);
    expect(jj(31)).toBe(31);

    expect(() => mm(60)).toThrow(/minute out of range/i);
    expect(() => hh(24)).toThrow(/hour out of range/i);
    expect(() => jj(0)).toThrow(/dayOfMonth out of range/i);
  });

  it("expands everyMinutes/everyHours/everyDaysOfMonth", () => {
    const linesByMinute = everyMinutes(15, {
      hh: 8,
      jj: "*",
      MMM: "*",
      JJJ: "*",
    });
    expect(linesByMinute.map((line) => line.mm)).toEqual([0, 15, 30, 45]);

    const linesByHour = everyHours(6, { mm: 0, jj: "*", MMM: "*", JJJ: "*" });
    expect(linesByHour.map((line) => line.hh)).toEqual([0, 6, 12, 18]);

    const linesByDay = everyDaysOfMonth(10, {
      mm: 0,
      hh: 8,
      MMM: "*",
      JJJ: "*",
    });
    expect(linesByDay.map((line) => line.jj)).toEqual([1, 11, 21, 31]);
  });
});
