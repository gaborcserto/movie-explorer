import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type {
  MovieDetails,
  MovieListResponse,
  PersonListResponse,
  SearchResponse,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import App from './App';
import {
  getMovie as originalGetMovie,
  getMovies as originalGetMovies,
  getWatchProviders as originalGetWatchProviders,
  getRatings as originalGetRatings,
  getDiscoverySection as originalGetDiscoverySection,
  getStreamingProviders as originalGetStreamingProviders,
  getPeople as originalGetPeople,
} from './util/apiUtils';

vi.mock('./util/apiUtils');
vi.mock('./pages/seriesPage', () => ({
  default: () => <h1>Series page</h1>,
}));
vi.mock('./pages/seriesPage/seasonPage', () => ({
  default: () => <h1>Season page</h1>,
}));
vi.mock('./pages/seriesPage/episodePage', () => ({
  default: () => <h1>Episode page</h1>,
}));

const getMovie = vi.mocked(originalGetMovie);
const getMovies = vi.mocked(originalGetMovies);
const getWatchProviders = vi.mocked(originalGetWatchProviders);
const getRatings = vi.mocked(originalGetRatings);
const getDiscoverySection = vi.mocked(originalGetDiscoverySection);
const getStreamingProviders = vi.mocked(originalGetStreamingProviders);
const getPeople = vi.mocked(originalGetPeople);

const movie: MovieDetails = {
  cast: ['Actor One'],
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
};

const moviesResponse: MovieListResponse = {
  movies: [movie],
  page: 1,
  totalPages: 1,
  totalResults: 1,
};

const emptyDiscoveryResponse: SearchResponse = {
  results: [],
  page: 1,
  totalPages: 1,
  totalResults: 0,
};
const streamingProviders: StreamingProviderInfo[] = [];

const emptyPeopleResponse: PersonListResponse = {
  people: [],
  page: 1,
  totalPages: 1,
  totalResults: 0,
};

function RouteLocation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output aria-label="Current route">
        {location.pathname + location.search + location.hash}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Forward
      </button>
    </>
  );
}

const renderApp = (initialEntry = '/search') => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouteLocation />
      <App />
    </MemoryRouter>
  );
};

describe('<App />', () => {
  beforeEach(() => {
    getWatchProviders.mockResolvedValue({ providers: [] });
    vi.clearAllMocks();
    getMovies.mockResolvedValue(moviesResponse);
    getMovie.mockResolvedValue(movie);
    getRatings.mockResolvedValue({
      tmdb: { status: 'available', score: 8.5, voteCount: null },
      imdb: { status: 'missing' },
    });
    getDiscoverySection.mockResolvedValue(emptyDiscoveryResponse);
    getStreamingProviders.mockResolvedValue(streamingProviders);
    getPeople.mockResolvedValue(emptyPeopleResponse);
  });

  test('renders the original search homepage before discovery content', async () => {
    renderApp('/');

    expect(
      screen.getByRole('heading', { name: 'FIND YOUR NEXT STORY' })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(
      Array.from(
        screen
          .getByRole('navigation', { name: 'Main navigation' })
          .querySelectorAll('a')
      ).map((link) => link.textContent)
    ).toEqual(['Home', 'Movies', 'Series', 'Library']);
    expect(
      await screen.findByRole('heading', { name: 'Movies' })
    ).toBeInTheDocument();
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(homeLink).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('10 movies loaded')).not.toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(getMovies).not.toHaveBeenCalled();
    expect(getDiscoverySection).toHaveBeenCalledTimes(3);
  });

  test('hides homepage discovery when a search or browsing tab is active', async () => {
    const { unmount } = renderApp('/search/Inception');

    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Movies' })
    ).not.toBeInTheDocument();

    unmount();
    renderApp('/?view=people');

    expect(
      await screen.findByRole('navigation', { name: 'Main navigation' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Persons' })).toBeNull();
    expect(
      await screen.findByRole('region', { name: 'People results' })
    ).toBeInTheDocument();
    expect(getPeople).toHaveBeenCalledWith('', 1, expect.any(AbortSignal));
    expect(
      screen.queryByRole('heading', { name: 'Movies' })
    ).not.toBeInTheDocument();
  });

  test('switches between Home and browsing while preserving browser history', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('link', { name: 'Movies' }));
    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Movies' })
    ).not.toBeInTheDocument();

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');
    await user.click(homeLink);
    expect(
      await screen.findByRole('heading', { name: 'Movies' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Sample Movie')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
  });

  test('renders the search route and loaded movie results', async () => {
    renderApp('/search');

    expect(document.querySelector('.app-header')).toHaveClass(
      'app-header--search'
    );
    expect(screen.getByTestId('search-component')).toBeVisible();
    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'MovieExplorer' })).toHaveLength(
      1
    );
    expect(
      screen.getAllByRole('link', { name: 'Movie Explorer' })
    ).toHaveLength(1);
    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
  });

  test('updates the route when a user searches', async () => {
    const user = userEvent.setup();

    renderApp('/search');

    await user.type(
      screen.getByPlaceholderText('What do you want to watch?'),
      'Inception'
    );
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(getMovies).toHaveBeenLastCalledWith(
      {
        sort: null,
        sortOrder: null,
        search: 'Inception',
        genres: null,
        releaseYear: null,
        minimumRating: null,
        page: 1,
      },
      expect.any(AbortSignal)
    );
  });

  test('renders movie details for movie routes', async () => {
    renderApp('/movie/1234');

    expect(document.querySelector('.App')).toHaveClass('App--details');
    expect(
      await screen.findByRole('heading', { name: 'Sample Movie' })
    ).toBeInTheDocument();
    expect(screen.getByText('Drama, Action')).toBeInTheDocument();
    expect(getMovie).toHaveBeenCalledWith(1234, expect.any(AbortSignal));
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: movie.title })
    );
    expect(screen.getByRole('banner').closest('main')).toBeNull();
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(screen.getByRole('contentinfo').closest('main')).toBeNull();
  });

  test.each([
    ['/tv/42', '/series/42'],
    ['/tv/42/seasons/3', '/series/42/seasons/3'],
    ['/tv/42/seasons/3/episodes/7', '/series/42/seasons/3/episodes/7'],
  ])('replaces legacy route %s with %s', async (legacyPath, seriesPath) => {
    renderApp(`${legacyPath}?view=details#episode`);

    expect(await screen.findByLabelText('Current route')).toHaveTextContent(
      `${seriesPath}?view=details#episode`
    );
  });

  test('legacy redirects preserve browser back and forward navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/search', '/tv/42?view=details#episode']}
        initialIndex={1}
      >
        <RouteLocation />
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByLabelText('Current route')).toHaveTextContent(
      '/series/42?view=details#episode'
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/search');
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent(
      '/series/42?view=details#episode'
    );
  });

  test('displays the 404 error page for non-existent routes', async () => {
    renderApp('/non-existent-route');

    expect(await screen.findByText('404')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to Search' })
    ).toHaveAttribute('href', '/search');
    expect(getMovies).not.toHaveBeenCalled();
  });

  test('renders the fatal fallback outside the route layout after a root render failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<App />);

      expect(
        screen.getByRole('heading', { name: 'Something went wrong' })
      ).toBeVisible();
      expect(
        screen.getByText('An unexpected error interrupted this scene.')
      ).toBeVisible();
      expect(
        document.querySelector('svg.popcorn-illustration')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'Back to Search' })
      ).toHaveAttribute('href', '/search');
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    } finally {
      // eslint-disable-next-line no-console
      vi.mocked(console.error).mockRestore();
    }
  });
});
