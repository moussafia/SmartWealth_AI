/** UUID v4, matching the identifier format the blueprint mandates (§6.1). */
export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO timestamp `days` in the past, used by the 30-day analysis windows. */
export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
