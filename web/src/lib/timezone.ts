import { format } from "date-fns";
import { tz } from "@date-fns/tz";

const NZ_TIMEZONE = "Pacific/Auckland";
const nzTz = tz(NZ_TIMEZONE);

/**
 * Format a date/time in New Zealand timezone
 * @param date - The date to format
 * @param formatStr - The format string (same as date-fns format)
 * @returns Formatted date string in NZ timezone
 */
export function formatInNZT(date: Date | string, formatStr: string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const nzTime = nzTz(dateObj);
  return format(nzTime, formatStr, { in: nzTz });
}

/**
 * Convert a date to New Zealand timezone
 * @param date - The date to convert
 * @returns TZDate object representing the time in NZ timezone
 */
export function toNZT(date: Date | string) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return nzTz(dateObj);
}

/**
 * Get the current time in New Zealand
 * @returns TZDate object representing current time in NZ timezone
 */
export function nowInNZT() {
  return nzTz(new Date());
}

/**
 * Check if a date is the same day in NZ timezone
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are on the same day in NZ timezone
 */
export function isSameDayInNZT(date1: Date | string, date2: Date | string): boolean {
  const nz1 = toNZT(date1);
  const nz2 = toNZT(date2);
  
  return (
    nz1.getFullYear() === nz2.getFullYear() &&
    nz1.getMonth() === nz2.getMonth() &&
    nz1.getDate() === nz2.getDate()
  );
}