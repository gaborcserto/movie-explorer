import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';

import LibraryPage from './libraryPage';
import { useLibraryStore } from '../../features/library/libraryStore';

function RouteControls() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output aria-label="Current route">{location.search}</output>
      <output aria-label="Current pathname">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Forward
      </button>
    </>
  );
}

function renderLibrary(path = '/library') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteControls />
      <Routes>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/" element={<h1>Homepage destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useLibraryStore.setState({ items: {}, persistenceWarning: null });
});

describe('Personal Library page', () => {
  it('renders Movie and Series Watchlist cards, removes independently and restores tab history', async () => {
    const movie = { mediaType: 'movie' as const, id: 9, title: 'Plan film' };
    const series = { mediaType: 'tv' as const, id: 9, title: 'Plan series' };
    useLibraryStore.getState().add(movie, 'watchlist');
    useLibraryStore.getState().add(series, 'watchlist');
    useLibraryStore.getState().add(movie, 'favorites');
    const user = userEvent.setup();
    renderLibrary('/library?collection=watchlist');

    expect(screen.getByRole('link', { name: 'Plan film' })).toHaveAttribute(
      'href',
      '/movie/9'
    );
    expect(screen.getByRole('link', { name: 'Plan series' })).toHaveAttribute(
      'href',
      '/series/9'
    );
    expect(screen.getByRole('img', { name: 'Plan series' })).toBeVisible();
    const remove = screen.getByRole('button', {
      name: 'Remove from Watchlist Plan film',
    });

    expect(remove.closest('a')).toBeNull();
    expect(remove.closest('button')).toBe(remove);
    await user.click(remove);

    expect(screen.queryByRole('link', { name: 'Plan film' })).toBeNull();
    expect(useLibraryStore.getState().has('movie:9', 'favorites')).toBe(true);
    expect(screen.getByRole('link', { name: /Watchlist \(1\)/ })).toHaveFocus();
    await user.click(screen.getByRole('link', { name: /Favorites \(1\)/ }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('link', { name: /Watchlist/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByRole('link', { name: /Favorites/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
  it('opens Watchlist directly with its own empty state', () => {
    renderLibrary('/library?collection=watchlist');

    expect(screen.getByRole('link', { name: /Watchlist/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('Your Watchlist is empty.')).toHaveAttribute(
      'role',
      'status'
    );
  });

  it('reuses the primary navigation with Library active and working browse links', async () => {
    const user = userEvent.setup();
    renderLibrary();

    const navigation = screen.getByRole('navigation', {
      name: 'Main navigation',
    });

    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim())
    ).toEqual(['Home', 'Movies', 'Series', 'Library']);
    expect(
      within(navigation).getByRole('link', { name: 'Library' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(navigation).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/');
    expect(
      within(navigation).getByRole('link', { name: 'Movies' })
    ).toHaveAttribute('href', '/?view=movies');
    expect(
      within(navigation).getByRole('link', { name: 'Series' })
    ).toHaveAttribute('href', '/?view=tv');

    await user.click(within(navigation).getByRole('link', { name: 'Movies' }));

    expect(
      screen.getByRole('heading', { name: 'Homepage destination' })
    ).toBeVisible();
    expect(screen.getByLabelText('Current pathname')).toHaveTextContent('/');
    expect(screen.getByLabelText('Current route')).toHaveTextContent(
      'view=movies'
    );
  });

  it('defaults to Favorites and reflects collection counts and membership changes', async () => {
    useLibraryStore.getState().add(
      {
        mediaType: 'movie',
        id: 11,
        title: 'Saved film',
        posterUrl: '/film.jpg',
        releaseDate: '2021-04-02',
      },
      'favorites'
    );
    useLibraryStore.getState().add(
      {
        mediaType: 'tv',
        id: 11,
        title: 'Saved series',
        posterUrl: null,
        firstAirDate: null,
      },
      'favorites'
    );

    const user = userEvent.setup();
    renderLibrary();

    expect(
      screen.getByRole('heading', { name: 'Personal Library' })
    ).toBeVisible();

    const hero = document.querySelector('.library-page__hero.header');

    expect(hero).toHaveClass('header--movie-details');
    expect(hero).not.toHaveTextContent(/Personal Library|saved movies/i);
    expect(
      document.querySelector('.library-page__content.list__container')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your saved movies and series, all in one place.')
    ).toBeVisible();

    expect(
      screen.getByRole('link', { name: /Favorites \(2\)/ })
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('img', { name: 'Saved film' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saved film' })).toHaveAttribute(
      'href',
      '/movie/11'
    );
    expect(screen.getByRole('link', { name: 'Saved series' })).toHaveAttribute(
      'href',
      '/series/11'
    );
    expect(screen.getByText('2021')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove from Favorites Saved film' })
    );

    expect(screen.queryByRole('link', { name: 'Saved film' })).toBeNull();
    expect(useLibraryStore.getState().has('movie:11', 'favorites')).toBe(false);
    expect(screen.getByRole('link', { name: /Favorites \(1\)/ })).toHaveFocus();
  });

  it('switches collections through the URL and supports Back and Forward', async () => {
    useLibraryStore
      .getState()
      .add(
        { mediaType: 'movie', id: 7, title: 'Favorite', releaseDate: '2020' },
        'watched'
      );
    const user = userEvent.setup();
    renderLibrary('/library?collection=invalid');

    expect(
      document.querySelector('.library-page__collection-panel')
    ).toHaveClass('tab-panel-stable');

    expect(screen.getByRole('link', { name: /Favorites/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByText(/Favorites collection is empty/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Watched/ }));

    expect(screen.getByLabelText('Current route')).toHaveTextContent(
      'collection=watched'
    );
    expect(screen.getByRole('link', { name: /Watched/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Favorite' })).toHaveAttribute(
      'href',
      '/movie/7'
    );

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('link', { name: /Favorites/ })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await user.click(screen.getByRole('button', { name: 'Forward' }));

    expect(screen.getByRole('link', { name: /Watched/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('shows collection-specific empty states and keeps memberships independent', async () => {
    useLibraryStore
      .getState()
      .add(
        { mediaType: 'tv', id: 9, title: 'Series', firstAirDate: '2019-01-01' },
        'favorites'
      );
    useLibraryStore
      .getState()
      .add(
        { mediaType: 'tv', id: 9, title: 'Series', firstAirDate: '2019-01-01' },
        'watched'
      );
    const user = userEvent.setup();
    renderLibrary('/library?collection=watched');

    await user.click(
      screen.getByRole('button', { name: 'Mark as Not Watched Series' })
    );

    expect(
      screen.getByText(/not marked any movies or series as watched/i)
    ).toBeInTheDocument();
    expect(useLibraryStore.getState().has('tv:9', 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has('tv:9', 'watched')).toBe(false);
  });
});
