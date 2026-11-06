import { act, fireEvent, render, screen } from '@testing-library/react';
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

test('switches immediately, preserves route and filters, and restores saved preferences', () => {
  render(
    <MemoryRouter initialEntries={['/search/Arrival?year=2020&view=tv']}>
      <PreferencesControls />
      <PrimaryNavigation mode="results" activeView="tv" query="Arrival" />
      <Location />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('EN · US'));
  fireEvent.change(screen.getByLabelText('Language'), {
    target: { value: 'hu-HU' },
  });
  expect(
    screen.getByRole('navigation', { name: 'Fő navigáció' })
  ).toBeVisible();
  expect(screen.getByLabelText('Nyelv')).toHaveValue('hu-HU');
  expect(document.documentElement.lang).toBe('hu-HU');
  expect(
    screen.getByText('/search/Arrival?year=2020&view=tv')
  ).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Streamingrégió'), {
    target: { value: 'HU' },
  });
  expect(screen.getByLabelText('Nyelv')).toHaveValue('hu-HU');
  expect(readPreferences()).toEqual({ language: 'hu-HU', region: 'HU' });
  expect(JSON.parse(localStorage.getItem(preferencesKey) ?? '{}')).toEqual(
    readPreferences()
  );
});

test('applies preferences in memory when persistence is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  render(<PreferencesControls />);

  fireEvent.click(screen.getByText('EN · US'));
  fireEvent.change(screen.getByLabelText('Streaming region'), {
    target: { value: 'HU' },
  });
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
