import { act, renderHook, waitFor } from '@testing-library/react';

import { genreFilterValue } from '../../i18n/labels';
import { i18n } from '../../i18n';
import { formatDate, formatNumber } from '../../i18n/format';
import usePreferencesStore from './preferencesStore';
import { defaultPreferences } from './preferencesStorage';
import useSeriesResource from '../../pages/seriesPage/hooks/useSeriesResource';
import request from '../../util/apiTransport';

afterEach(() => {
  vi.restoreAllMocks();
  act(() =>
    usePreferencesStore.setState({
      preferences: { ...defaultPreferences },
      persistenceFailed: false,
    })
  );
});

test('refetches an existing resource and ignores an obsolete response without remounting', async () => {
  let release: (response: Response) => void = () => undefined;
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        })
    )
    .mockResolvedValueOnce(Response.json({ title: 'Magyar cím' }));

  const load = (signal: AbortSignal) =>
    request<{ title: string }>('/api/v1/series/1', { signal });
  const { result } = renderHook(() => useSeriesResource(load, true));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

  act(() =>
    usePreferencesStore.getState().updatePreferences({ language: 'hu-HU' })
  );
  await waitFor(() => expect(result.current.data?.title).toBe('Magyar cím'));

  await act(async () => {
    release(Response.json({ title: 'Old English title' }));
  });
  expect(result.current.data?.title).toBe('Magyar cím');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toContain('language=hu-HU');
});

test('keeps translated genre labels out of shareable filter identifiers', () => {
  expect(genreFilterValue('Akció')).toBe('action');
  expect(genreFilterValue('Dráma')).toBe('drama');
  expect(genreFilterValue('Action')).toBe('action');
});

test('formats Hungarian dates and numbers without changing source values', async () => {
  await i18n.changeLanguage('hu-HU');
  expect(formatDate('2026-02-03')).toBe('2026. 02. 03.');
  expect(formatNumber(7.8, 1)).toBe('7,8');
  expect(formatDate('unavailable')).toBe('unavailable');
});
