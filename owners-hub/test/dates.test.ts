import { describe, expect, it } from "vitest";
import { addDays, dateInWeek, dayOfWeek, isValidDay, relativeDay, todayStr, weekStartOf } from "@/lib/dates";

describe("dates", () => {
  it("computes today in the company timezone, not UTC", () => {
    // 03:30 UTC on Sep 24 is still Sep 23 in Chicago.
    expect(todayStr(new Date("2026-09-24T03:30:00Z"), "America/Chicago")).toBe("2026-09-23");
    expect(todayStr(new Date("2026-09-24T03:30:00Z"), "UTC")).toBe("2026-09-24");
  });

  it("weeks start on Monday", () => {
    expect(dayOfWeek("2026-09-21")).toBe(1);
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-23")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21"); // Sunday belongs to the week before
  });

  it("maps weekdays into a Monday-start week", () => {
    expect(dateInWeek("2026-09-21", 1)).toBe("2026-09-21"); // Mon
    expect(dateInWeek("2026-09-21", 4)).toBe("2026-09-24"); // Thu
    expect(dateInWeek("2026-09-21", 0)).toBe("2026-09-27"); // Sun
  });

  it("adds days across month/DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("validates day strings", () => {
    expect(isValidDay("2026-02-28")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("nope")).toBe(false);
  });

  it("labels relative days", () => {
    expect(relativeDay("2026-09-23", "2026-09-23")).toBe("Today");
    expect(relativeDay("2026-09-24", "2026-09-23")).toBe("Tomorrow");
    expect(relativeDay("2026-09-22", "2026-09-23")).toBe("Yesterday");
  });
});
