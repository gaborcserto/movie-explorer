import { useEffect, useState } from 'react';

export default function useSeriesResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  initial?: T
) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(enabled && !initial);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || (initial && attempt === 0)) {
      return undefined;
    }
    const controller = new AbortController();
    setPending(true);
    load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError(undefined);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPending(false);
        }
      });

    return () => controller.abort();
  }, [load, enabled, initial, attempt]);

  return {
    data,
    setData,
    error,
    pending,
    retry: () => setAttempt((value) => value + 1),
  };
}
