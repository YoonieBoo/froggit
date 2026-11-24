// When the New Year party happens. No DOM here, so it can be unit tested.

/** True during the first minute of January 1st, by this computer's own clock. */
export function isNewYearMinute(date: Date): boolean {
  return date.getMonth() === 0 && date.getDate() === 1 && date.getHours() === 0 && date.getMinutes() === 0;
}
