import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';

import PreferencesControls from './preferencesControls';
import usePreferencesStore from '../preferencesStore';
import {
  defaultPreferences,
  preferencesKey,
  readPreferences,
} from '../preferencesStorage';
import PrimaryNavigation from '../../../components/navigation';
import request from '../../../util/apiTransport';

function Location() {
  const location = useLocation();

  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
}

beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({
    preferences: { ...defaultPreferences },
    persistenceFailed: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  act(() =>
    usePreferencesStore.setState({
      preferences: { ...defaultPreferences },
      persistenceFailed: false,
    })
  );
});

test('switches immediately, preserves route and filters, and restores saved preferences', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/search/Arrival?year=2020&view=tv']}>
      <PreferencesControls />
      <PrimaryNavigation mode="results" activeView="tv" query="Arrival" />
      <Location />
    </MemoryRouter>
  );

  await user.click(screen.getByLabelText('Language and region settings'));
  await user.click(screen.getByRole('combobox', { name: 'Language' }));
  await user.click(screen.getByRole('option', { name: 'Magyar' }));
  expect(
    screen.getByRole('navigation', { name: 'Fő navigáció' })
  ).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Nyelv' })).toHaveAttribute(
    'data-value',
    'hu-HU'
  );
  expect(document.documentElement.lang).toBe('hu-HU');
  expect(
    screen.getByText('/search/Arrival?year=2020&view=tv')
  ).toBeInTheDocument();

  await user.click(screen.getByRole('combobox', { name: 'Streamingrégió' }));
  await user.click(
    screen.getByRole('option', {
      name: new Intl.DisplayNames(['hu-HU'], { type: 'region' }).of('HU')!,
    })
  );
  expect(screen.getByRole('combobox', { name: 'Nyelv' })).toHaveAttribute(
    'data-value',
    'hu-HU'
  );
  expect(readPreferences()).toEqual({ language: 'hu-HU', region: 'HU' });
  expect(JSON.parse(localStorage.getItem(preferencesKey) ?? '{}')).toEqual(
    readPreferences()
  );
});

test('applies preferences in memory when persistence is unavailable', async () => {
  const user = userEvent.setup();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  render(<PreferencesControls />);

  await user.click(screen.getByLabelText('Language and region settings'));
  await user.click(screen.getByRole('combobox', { name: 'Streaming region' }));
  await user.click(screen.getByRole('option', { name: 'Hungary' }));
  expect(usePreferencesStore.getState().preferences).toEqual({
    language: 'en-US',
    region: 'HU',
  });
  expect(screen.getByRole('status')).toHaveTextContent('could not be saved');
});

test('localizes requests and cancels a response from the previous locale', async () => {
  let resolve: (response: Response) => void = () => undefined;
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  const pending = request('/api/v1/movies/1');
  const obsolete = expect(pending).rejects.toMatchObject({
    category: 'cancelled',
  });

  act(() =>
    usePreferencesStore
      .getState()
      .updatePreferences({ language: 'hu-HU', region: 'HU' })
  );
  resolve(Response.json({ title: 'Old English response' }));
  await obsolete;

  fetchMock.mockResolvedValueOnce(Response.json({ title: 'Magyar cím' }));
  await expect(request('/api/v1/movies/1')).resolves.toEqual({
    title: 'Magyar cím',
  });
  expect(fetchMock.mock.calls[1][0]).toBe(
    '/api/v1/movies/1?language=hu-HU&watchRegion=HU'
  );
});
