export default function parseDetailId(value: string): number {
  const id = /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : NaN;
}
