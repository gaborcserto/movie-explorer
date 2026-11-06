import { useCallback, useEffect, useRef, useState } from 'react';

import usePreferencesStore from '../../../../features/preferences/preferencesStore';
import { isCancelledError } from '../../../../util/errorPresentation';

type Snapshot<Response, Item> = {
  data: Response;
  items: Item[];
  visible: number;
};

export default function usePaginatedResults<Response, Item>(
  restored: Snapshot<Response, Item> | undefined,
  fetchPage: (page: number, signal: AbortSignal) => Promise<Response>,
  getItems: (response: Response) => Item[],
  getKey: (item: Item) => string | number
) {
  const guestPreferences = usePreferencesStore((state) => state.preferences);

  const [data, setData] = useState<Response | undefined>(restored?.data);
  const [items, setItems] = useState<Item[]>(restored?.items ?? []);
  const [visible, setVisible] = useState(restored?.visible ?? 10);
  const [loading, setLoading] = useState(!restored);
  const [error, setError] = useState<unknown>(null);
  const [moreError, setMoreError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

  const [requestPreferences, setRequestPreferences] =
    useState(guestPreferences);

  if (requestPreferences !== guestPreferences) {
    setRequestPreferences(guestPreferences);
    setData(restored?.data);
    setItems(restored?.items ?? []);
    setVisible(restored?.visible ?? 10);
    setLoading(!restored);
    setError(null);
    setMoreError(null);
  }

  const load = useCallback(
    async (page: number, revealed = 0) => {
      if (busy.current) {
        return;
      }

      busy.current = true;
      controller.current?.abort();

      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setMoreError(null);

      try {
        const response = await fetchPage(page, request.signal);

        if (request.signal.aborted) {
          return;
        }

        setError(null);
        setData(response);
        setItems((current) => [
          ...new Map(
            [...(page === 1 ? [] : current), ...getItems(response)].map(
              (item) => [getKey(item), item]
            )
          ).values(),
        ]);
        setVisible(page === 1 ? 10 : revealed + 10);
      } catch (failure: unknown) {
        if (request.signal.aborted || isCancelledError(failure)) {
          return;
        }
        if (page === 1) {
          setError(failure);
        } else {
          setMoreError(failure);
        }
      } finally {
        if (!request.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [fetchPage, getItems, getKey]
  );

  useEffect(() => {
    if (!restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the cancellable initial request only when history has no restored snapshot.
      load(1);
    }

    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [load, restored, guestPreferences]);

  return { data, items, visible, setVisible, loading, error, moreError, load };
}
