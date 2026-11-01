import { ApiRequestError } from './apiErrors';

let active = 0;
const waiting: Array<{ start: () => void; signal?: AbortSignal }> = [];

// Bound cold pool fan-out to two categories; one slow row cannot block all others.
export default function scheduleRecommendation<T>(
  load: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let started = false;

    function cancel() {
      if (started) {
        return;
      }

      const index = waiting.findIndex((entry) => entry.signal === signal);

      if (index >= 0) {
        waiting.splice(index, 1);
      }
      reject(new ApiRequestError('cancelled'));
    }

    function start() {
      signal?.removeEventListener('abort', cancel);
      if (signal?.aborted) {
        reject(new ApiRequestError('cancelled'));

        return;
      }

      started = true;
      active += 1;
      load()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          waiting.shift()?.start();
        });
    }

    if (signal?.aborted) {
      reject(new ApiRequestError('cancelled'));
    } else if (active < 2) {
      start();
    } else {
      waiting.push({ start, signal });
      signal?.addEventListener('abort', cancel, { once: true });
    }
  });
}
