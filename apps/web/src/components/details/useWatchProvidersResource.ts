import { useEffect, useState } from 'react';
import type { WatchProvider } from '@movie-explorer/contracts';

import { getWatchProviders } from '../../util/apiUtils';

export default function useWatchProvidersResource(
  kind: 'movies' | 'series',
  id: number,
  enabled: boolean
) {
  const key = `${kind}:${id}`;
  const [result, setResult] = useState<{
    key: string;
    providers: WatchProvider[];
  }>();
  const [errorKey, setErrorKey] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    setPendingKey(key);

    getWatchProviders(kind, id, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setResult({ key, providers: response.providers });
          setErrorKey(undefined);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErrorKey(key);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPendingKey(undefined);
        }
      });

    return () => controller.abort();
  }, [kind, id, enabled, attempt, key]);

  const providers = result?.key === key ? result.providers : [];
  const pending =
    enabled &&
    (pendingKey === key ||
      (pendingKey === undefined && result?.key !== key && errorKey !== key));
  const error = errorKey === key;

  const retry = () => {
    setPendingKey(key);
    setAttempt((value) => value + 1);
  };

  return {
    providers,
    pending,
    error,
    retry,
  };
}
