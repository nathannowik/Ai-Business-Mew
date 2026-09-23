// Calendar-day helpers. A "day" is a "YYYY-MM-DD" string in the company
// timezone; arithmetic is done on UTC midnights so DST never shifts a day.

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Chicago";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todayStr(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current hour (0–23) in the company timezone. */
export function currentHour(now: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h);
}

function toUTC(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && fromUTC(toUTC(day)) === day;
}

export function addDays(day: string, n: number): string {
  const d = toUTC(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** 0=Sunday … 6=Saturday */
export function dayOfWeek(day: string): number {
  return toUTC(day).getUTCDay();
}

/** Monday of the week containing `day` (weeks run Monday–Sunday). */
export function weekStartOf(day: string): string {
  const offset = (dayOfWeek(day) + 6) % 7;
  return addDays(day, -offset);
}

/** The date within the Monday-start week for a given weekday (0=Sun … 6=Sat). */
export function dateInWeek(weekStart: string, weekday: number): string {
  return addDays(weekStart, (weekday + 6) % 7);
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(toUTC(day));
}

export function formatWeek(weekStart: string): string {
  return `Week of ${formatDay(weekStart, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** "Today", "Tomorrow", "Yesterday", or "Wed, Sep 30". */
export function relativeDay(day: string, today: string = todayStr()): string {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  if (day === addDays(today, -1)) return "Yesterday";
  return formatDay(day);
}
