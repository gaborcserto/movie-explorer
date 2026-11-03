import { act, renderHook } from '@testing-library/react';
import type { WatchProviders } from '@movie-explorer/contracts';

import { getWatchProviders } from '../../util/apiUtils';
import useWatchProvidersResource from './useWatchProvidersResource';

vi.mock('../../util/apiUtils', () => ({ getWatchProviders: vi.fn() }));

function deferred() {
  let resolve!: (value: WatchProviders) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<WatchProviders>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    }
  );

  return { promise, resolve, reject };
}

beforeEach(() => vi.mocked(getWatchProviders).mockReset());

test('aborts obsolete identities and ignores their late failure', async () => {
  const first = deferred();
  const second = deferred();
  vi.mocked(getWatchProviders)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, rerender } = renderHook(
    ({ id }) => useWatchProvidersResource('movies', id, true),
    { initialProps: { id: 1 } }
  );
  expect(result.current.pending).toBe(true);

  rerender({ id: 2 });
  expect(vi.mocked(getWatchProviders).mock.calls[0][2]?.aborted).toBe(true);
  await act(async () => second.resolve({ providers: [] }));
  expect(result.current.pending).toBe(false);

  await act(async () => first.reject(new Error('obsolete')));
  expect(result.current.error).toBe(false);
  expect(result.current.pending).toBe(false);
  expect(getWatchProviders).toHaveBeenCalledTimes(2);
});

test('publishes pending on retry and clears the recovered error', async () => {
  const first = deferred();
  const second = deferred();
  vi.mocked(getWatchProviders)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result } = renderHook(() =>
    useWatchProvidersResource('series', 1, true)
  );

  await act(async () => first.reject(new Error('unavailable')));
  expect(result.current.error).toBe(true);
  expect(result.current.pending).toBe(false);

  act(() => result.current.retry());
  expect(result.current.pending).toBe(true);
  await act(async () => second.resolve({ providers: [] }));
  expect(result.current.error).toBe(false);
  expect(result.current.pending).toBe(false);
});

test('revalidates on re-enable and aborts on unmount', async () => {
  const first = deferred();
  const second = deferred();
  vi.mocked(getWatchProviders)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, rerender, unmount } = renderHook(
    ({ enabled }) => useWatchProvidersResource('movies', 1, enabled),
    { initialProps: { enabled: false } }
  );
  expect(getWatchProviders).not.toHaveBeenCalled();

  rerender({ enabled: true });
  await act(async () => first.resolve({ providers: [] }));
  expect(result.current.pending).toBe(false);

  rerender({ enabled: false });
  expect(result.current.pending).toBe(false);
  rerender({ enabled: true });
  expect(result.current.pending).toBe(true);
  unmount();
  expect(vi.mocked(getWatchProviders).mock.calls[1][2]?.aborted).toBe(true);
  await act(async () => second.resolve({ providers: [] }));
});
