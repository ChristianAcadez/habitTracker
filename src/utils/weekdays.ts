export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function parseWeekdays(value: string): number[] {
  return value.split(',').filter(Boolean).map(Number);
}

export function serializeWeekdays(days: number[]): string {
  return [...days].sort((a, b) => a - b).join(',');
}