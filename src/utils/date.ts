// src/utils/date.ts
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // usa componentes de fecha LOCALES, no UTC
}

export function getTodayString(): string {
  return toDateString(new Date());
}