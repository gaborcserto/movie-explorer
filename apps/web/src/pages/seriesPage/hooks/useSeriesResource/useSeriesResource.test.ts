import { act, renderHook } from '@testing-library/react';

import useSeriesResource from './useSeriesResource';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

test('clears the previous selection and ignores its late completion', async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const loadFirst = vi.fn<(signal: AbortSignal) => Promise<string>>(
    () => first.promise
  );
  const loadSecond = vi.fn<(signal: AbortSignal) => Promise<string>>(
    () => second.promise
  );
  const { result, rerender } = renderHook(
    ({ load }) => useSeriesResource(load, true),
    { initialProps: { load: loadFirst } }
  );

  expect(result.current.pending).toBe(true);

  rerender({ load: loadSecond });

  expect(loadFirst.mock.calls[0][0].aborted).toBe(true);
  expect(result.current.data).toBeUndefined();

  await act(async () => second.resolve('second'));

  expect(result.current.data).toBe('second');
  expect(result.current.pending).toBe(false);

  await act(async () => first.resolve('obsolete'));

  expect(result.current.data).toBe('second');
  expect(result.current.error).toBeUndefined();
  expect(loadFirst).toHaveBeenCalledTimes(1);
  expect(loadSecond).toHaveBeenCalledTimes(1);
});

test('uses initial data without a request and refreshes it explicitly', async () => {
  const refresh = deferred<string>();
  const load = vi.fn<(signal: AbortSignal) => Promise<string>>(
    () => refresh.promise
  );
  const { result } = renderHook(() => useSeriesResource(load, true, 'initial'));

  expect(result.current.data).toBe('initial');
  expect(result.current.pending).toBe(false);
  expect(load).not.toHaveBeenCalled();

  act(() => result.current.retry());

  expect(result.current.pending).toBe(true);
  expect(result.current.data).toBe('initial');

  await act(async () => refresh.resolve('refreshed'));

  expect(result.current.data).toBe('refreshed');
  expect(result.current.pending).toBe(false);
});

test('starts a retry after failure and aborts it on unmount', async () => {
  const failure = deferred<string>();
  const retry = deferred<string>();
  const load = vi.fn<(signal: AbortSignal) => Promise<string>>(
    () => failure.promise
  );
  const { result, unmount } = renderHook(() => useSeriesResource(load, true));
  const error = new Error('unavailable');

  await act(async () => failure.reject(error));

  expect(result.current.error).toBe(error);
  expect(result.current.pending).toBe(false);

  load.mockImplementation(() => retry.promise);
  act(() => result.current.retry());

  expect(result.current.pending).toBe(true);
  expect(load).toHaveBeenCalledTimes(2);

  unmount();

  expect(load.mock.calls[1][0].aborted).toBe(true);

  await act(async () => retry.resolve('unmounted'));
});

test('clears a failed selection when changing to a disabled loader', async () => {
  const failure = deferred<string>();
  const load = vi.fn<(signal: AbortSignal) => Promise<string>>(
    () => failure.promise
  );
  const { result, rerender } = renderHook(
    ({ enabled }) => useSeriesResource(load, enabled),
    { initialProps: { enabled: true } }
  );

  await act(async () => failure.reject(new Error('unavailable')));
  rerender({ enabled: false });

  expect(result.current.error).toBeUndefined();
  expect(result.current.data).toBeUndefined();
  expect(result.current.pending).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);
});
