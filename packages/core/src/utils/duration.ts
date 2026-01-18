/**
 * Utilities for parsing duration strings into hours.
 */

export const DURATION_REGEX = /^(\d+)(y|m|w|d)$/;

/**
 * Parses a duration string (e.g., "1y", "6m", "30d") into hours.
 *
 * Supported units:
 * - y: Years (365 days)
 * - m: Months (30 days)
 * - w: Weeks (7 days)
 * - d: Days
 *
 * @param duration The duration string to parse
 * @returns The number of hours
 * @throws Error if the format is invalid
 */
export function parseDuration(duration: string): number {
  if (!duration) {
    throw new Error('Duration string cannot be empty');
  }

  const match = duration.toLowerCase().match(DURATION_REGEX);

  if (!match) {
    throw new Error(
      `Invalid duration format: "${duration}". Expected format like "1y", "6m", "30d".`
    );
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case 'y':
      return value * 365 * 24;
    case 'm':
      return value * 30 * 24;
    case 'w':
      return value * 7 * 24;
    case 'd':
      return value * 24;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

/**
 * Formats a duration in hours into a human-readable string.
 * @param hours The number of hours
 * @returns A human-readable string (e.g., "1 year", "6 months", "3 days")
 */
export function formatDuration(hours: number): string {
  if (hours >= 365 * 24) {
    const years = (hours / (365 * 24)).toFixed(1).replace(/\.0$/, '');
    return `${years} year${years === '1' ? '' : 's'}`;
  }
  if (hours >= 30 * 24) {
    const months = (hours / (30 * 24)).toFixed(1).replace(/\.0$/, '');
    return `${months} month${months === '1' ? '' : 's'}`;
  }
  if (hours >= 7 * 24) {
    const weeks = (hours / (7 * 24)).toFixed(1).replace(/\.0$/, '');
    return `${weeks} week${weeks === '1' ? '' : 's'}`;
  }
  const days = (hours / 24).toFixed(1).replace(/\.0$/, '');
  return `${days} day${days === '1' ? '' : 's'}`;
}
