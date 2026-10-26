import { useCallback, useEffect, useState } from 'react';
import type { Ratings } from '@movie-explorer/contracts';
import { getRatings } from '../../util/apiUtils';

export default function useRatingsResource(
  kind: 'movie' | 'series',
  id: number,
  enabled: boolean
) {
  const [result, setResult] = useState<{ key: string; value: Ratings }>();
  const [errorKey, setErrorKey] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const key = `${kind}:${id}:${attempt}`;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    getRatings(kind, id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setResult({ key, value });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErrorKey(key);
        }
      });

    return () => controller.abort();
  }, [kind, id, enabled, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const ratings = result?.key === key ? result.value : undefined;
  const error = errorKey === key;

  return { ratings, error, retry, loading: enabled && !ratings && !error };
}
