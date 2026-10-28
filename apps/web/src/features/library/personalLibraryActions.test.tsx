import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PersonalLibraryActions from './personalLibraryActions';
import { mediaKey, useLibraryStore } from './libraryStore';

beforeEach(() => {
  useLibraryStore.setState({ items: {} });
});

test('renders independently toggleable accessible controls and synchronizes with the store', () => {
  render(
    <PersonalLibraryActions
      mediaType="movie"
      id={17}
      title="Interstellar"
      releaseDate="2014-11-07"
      presentation="compact"
    />
  );

  const watchlist = screen.getByRole('button', {
    name: 'Add to Watchlist Interstellar',
  });
  const watched = screen.getByRole('button', {
    name: 'Mark as Watched Interstellar',
  });
  const favorites = screen.getByRole('button', {
    name: 'Add to Favorites Interstellar',
  });

  expect(watchlist).toHaveAttribute('aria-pressed', 'false');
  expect(watched).toHaveAttribute('aria-pressed', 'false');
  expect(favorites).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(watchlist);

  expect(
    screen.getByRole('button', { name: 'Remove from Watchlist Interstellar' })
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.getByRole('button', { name: 'Mark as Watched Interstellar' })
  ).toHaveAttribute('aria-pressed', 'false');
  expect(
    useLibraryStore.getState().has(mediaKey('movie', 17), 'watchlist')
  ).toBe(true);
});

test('keeps movie and TV items with the same TMDB ID independent', () => {
  render(
    <>
      <PersonalLibraryActions mediaType="movie" id={42} title="Movie" />
      <PersonalLibraryActions mediaType="tv" id={42} title="Series" />
    </>
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Add to Favorites Movie' })
  );

  expect(
    useLibraryStore.getState().has(mediaKey('movie', 42), 'favorites')
  ).toBe(true);
  expect(useLibraryStore.getState().has(mediaKey('tv', 42), 'favorites')).toBe(
    false
  );
});

test('supports native keyboard activation for the action buttons', async () => {
  const user = userEvent.setup();

  render(<PersonalLibraryActions mediaType="movie" id={8} title="Arrival" />);

  await user.tab();
  await user.keyboard('{Enter}');

  expect(
    screen.getByRole('button', { name: 'Remove from Watchlist Arrival' })
  ).toHaveAttribute('aria-pressed', 'true');

  await user.tab();
  await user.tab();
  await user.keyboard(' ');

  expect(
    screen.getByRole('button', { name: 'Remove from Favorites Arrival' })
  ).toHaveAttribute('aria-pressed', 'true');
});
