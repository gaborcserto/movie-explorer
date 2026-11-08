import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PersonalLibraryActions from './personalLibraryActions';
import { mediaKey, useLibraryStore } from '../libraryStore';

beforeEach(() => {
  useLibraryStore.setState({ items: {} });
});

test.each(['movie', 'tv'] as const)(
  'synchronizes %s Watchlist actions across components using keyboard activation',
  async (mediaType) => {
    const user = userEvent.setup();
    render(
      <>
        <PersonalLibraryActions
          mediaType={mediaType}
          id={42}
          title="Shared title"
        />
        <PersonalLibraryActions
          mediaType={mediaType}
          id={42}
          title="Shared title"
          presentation="expanded"
        />
      </>
    );
    screen
      .getAllByRole('button', { name: 'Add to Watchlist Shared title' })[0]
      .focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getAllByRole('button', {
        name: 'Remove from Watchlist Shared title',
      })
    ).toHaveLength(2);
    expect(
      useLibraryStore.getState().items[`${mediaType}:42`].collections
    ).toEqual({ watched: false, favorites: false, watchlist: true });

    await user.click(
      screen.getAllByRole('button', { name: 'Mark as Watched Shared title' })[0]
    );
    expect(useLibraryStore.getState().has(`${mediaType}:42`, 'watchlist')).toBe(
      true
    );

    screen
      .getAllByRole('button', { name: 'Remove from Watchlist Shared title' })[1]
      .focus();
    await user.keyboard(' ');

    expect(
      screen.getAllByRole('button', { name: 'Add to Watchlist Shared title' })
    ).toHaveLength(2);
    expect(useLibraryStore.getState().has(`${mediaType}:42`, 'watched')).toBe(
      true
    );
  }
);

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

  const watched = screen.getByRole('button', {
    name: 'Mark as Watched Interstellar',
  });
  const favorites = screen.getByRole('button', {
    name: 'Add to Favorites Interstellar',
  });

  expect(watched).toHaveAttribute('aria-pressed', 'false');
  expect(favorites).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(favorites);

  expect(
    screen.getByRole('button', { name: 'Remove from Favorites Interstellar' })
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.getByRole('button', { name: 'Mark as Watched Interstellar' })
  ).toHaveAttribute('aria-pressed', 'false');
  expect(
    useLibraryStore.getState().has(mediaKey('movie', 17), 'favorites')
  ).toBe(true);

  fireEvent.click(watched);

  expect(
    screen.getByRole('button', { name: 'Mark as Not Watched Interstellar' })
  ).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(
    screen.getByRole('button', { name: 'Remove from Favorites Interstellar' })
  );

  expect(
    screen.getByRole('button', { name: 'Mark as Not Watched Interstellar' })
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.getByRole('button', { name: 'Add to Watchlist Interstellar' })
  ).toHaveAttribute('aria-pressed', 'false');
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

test('shows text labels for expanded actions while compact card actions stay icon-only', () => {
  const { rerender } = render(
    <PersonalLibraryActions
      mediaType="movie"
      id={18}
      title="Dune"
      presentation="expanded"
    />
  );

  expect(screen.getByText('Watched')).toBeVisible();
  expect(screen.getByText('Favorites')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Add to Favorites Dune' })
  ).toHaveAttribute('aria-pressed', 'false');

  rerender(<PersonalLibraryActions mediaType="movie" id={18} title="Dune" />);

  expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Add to Favorites Dune' })
  ).toBeInTheDocument();
});

test('supports native keyboard activation for the action buttons', async () => {
  const user = userEvent.setup();

  render(<PersonalLibraryActions mediaType="movie" id={8} title="Arrival" />);

  await user.tab();
  await user.keyboard('{Enter}');

  expect(
    screen.getByRole('button', { name: 'Mark as Not Watched Arrival' })
  ).toHaveAttribute('aria-pressed', 'true');

  await user.tab();
  await user.keyboard(' ');

  expect(
    screen.getByRole('button', { name: 'Remove from Favorites Arrival' })
  ).toHaveAttribute('aria-pressed', 'true');
});
