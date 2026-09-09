/** 'YYYY-MM-DD' as the day the table reads: 09/09/2026. */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Day and month only: 07/09. Enough for "a partida de quando?" inside one line. */
export function formatShortDay(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}
