/** Local calendar date as 'YYYY-MM-DD' — a match belongs to the day it was played locally. */
export function toLocalDate(moment: Date): string {
  const year = moment.getFullYear();
  const month = `${moment.getMonth() + 1}`.padStart(2, '0');
  const day = `${moment.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toLocalDate(new Date());
}
