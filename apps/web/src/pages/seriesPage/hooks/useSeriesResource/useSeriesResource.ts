import { useEffect, useState } from 'react';

import usePreferencesStore from '../../../../features/preferences/preferencesStore';

export default function useSeriesResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  initial?: T
) {
  const guestPreferences = usePreferencesStore((state) => state.preferences);

  const [initialPreferences] = useState(guestPreferences);
  const usableInitial =
    initialPreferences === guestPreferences ? initial : undefined;
  const [data, setData] = useState<T | undefined>(usableInitial);
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(enabled && !usableInitial);
  const [attempt, setAttempt] = useState(0);
  const [identity, setIdentity] = useState({
    load,
    enabled,
    usableInitial,
    guestPreferences,
  });

  // The loader identifies the selected series/season. Reset before children
  // commit so they never observe the previous selection's data or error.
  if (
    identity.guestPreferences !== guestPreferences ||
    identity.load !== load ||
    identity.enabled !== enabled ||
    identity.usableInitial !== usableInitial
  ) {
    setIdentity({ load, enabled, usableInitial, guestPreferences });
    setData(usableInitial);
    setError(undefined);
    setPending(enabled && !usableInitial);
    setAttempt(0);
  }

  useEffect(() => {
    if (!enabled || (usableInitial && attempt === 0)) {
      return undefined;
    }

    const controller = new AbortController();

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
  }, [load, enabled, usableInitial, attempt, guestPreferences]);

  return {
    data,
    setData,
    error,
    pending,
    retry: () => {
      setPending(enabled);
      setAttempt((value) => value + 1);
    },
  };
}
