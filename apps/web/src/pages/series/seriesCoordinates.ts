export default function parseSeasonNumber(value: string): number {
  const number = /^\d+$/.test(value) ? Number(value) : NaN;

  return Number.isSafeInteger(number) && number >= 0 ? number : NaN;
}
