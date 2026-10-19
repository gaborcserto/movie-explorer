// Normalize only bounded delays or canonical HTTP dates; never forward raw headers.
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else {
    const date = Date.parse(value);
    if (!Number.isFinite(date) || new Date(date).toUTCString() !== value) {
      return undefined;
    }

    seconds = Math.ceil((date - Date.now()) / 1000);
  }
  return Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86_400
    ? seconds
    : undefined;
}
