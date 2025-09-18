/**
 * Utility functions for shift-related operations
 */

/**
 * Checks if a shift has been completed (ended)
 * Uses the shift's end time to determine if it's in the past
 * 
 * @param shiftEnd - The end time of the shift (Date or string)
 * @returns True if the shift has ended, false otherwise
 */
export function isShiftCompleted(shiftEnd: Date | string): boolean {
  return new Date() > new Date(shiftEnd);
}

/**
 * Type for shift objects with required date fields
 */
export interface ShiftWithDates {
  start: Date | string;
  end: Date | string;
}

/**
 * Checks if a shift has been completed using a shift object
 * 
 * @param shift - Shift object with start and end dates
 * @returns True if the shift has ended, false otherwise
 */
export function isShiftCompletedFromShift(shift: ShiftWithDates): boolean {
  return isShiftCompleted(shift.end);
}