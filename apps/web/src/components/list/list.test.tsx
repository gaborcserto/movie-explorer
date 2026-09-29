import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import List from './list';
import { getMovies as originalGetMovies } from '../../util/apiUtils';

const getMovies = vi.mocked(originalGetMovies);
vi.mock('../../util/apiUtils');

const renderList = (initialEntry = '/search') => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/search/:searchQuery?" element={<List />} />
      </Routes>
    </MemoryRouter>
  );
};

const emptyResponse = (total: number) => ({
  movies: [],
  totalResults: total,
  page: 1,
  totalPages: 1,
});

describe('<List />', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('it displays a loading indicator while fetching data', () => {
    getMovies.mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it displays movies when the fetch is successful', async () => {
    const mockMovies = {
      movies: [
        {
          id: 1,
          title: 'Movie 1',
          releaseDate: '2022-01-01',
          posterUrl: '/movie-1.jpg',
          genres: ['test'],
        },
        {
          id: 2,
          title: 'Movie 2',
          releaseDate: '2023-01-01',
          posterUrl: '/movie-2.jpg',
          genres: ['test', 'crime'],
        },
      ],
      totalResults: 2,
      page: 1,
      totalPages: 1,
    };

    getMovies.mockResolvedValue(mockMovies);

    renderList('/search/Movie?filter=crime&sorting=releaseDate&order=desc');

    await waitFor(() => {
      const h2Element = screen.getByText(/text search results/i);
      expect(h2Element).toBeInTheDocument();

      const strongElement = document.querySelector('strong');
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe('2');
    });

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText('2 matching movies loaded')).toBeInTheDocument();
    expect(screen.getByText(/genre:/i)).toHaveTextContent('Crime');
    expect(screen.getByText(/search:/i)).toHaveTextContent('"Movie"');
    expect(getMovies).toHaveBeenCalledWith(
      {
        sort: null,
        sortOrder: null,
        search: 'Movie',
        genres: 'crime',
        releaseYear: null,
        minimumRating: null,
        page: 1,
      },
      expect.any(AbortSignal)
    );
  });

  test('it displays the unfiltered result total', async () => {
    getMovies.mockResolvedValue(emptyResponse(20_001));

    renderList();

    expect(
      await screen.findByRole('heading', { name: '20001 movies found' })
    ).toBeInTheDocument();
  });

  test('it displays the genre-filtered result total', async () => {
    getMovies.mockResolvedValue(emptyResponse(837));

    renderList('/search?filter=documentary');

    expect(
      await screen.findByRole('heading', { name: '837 movies found' })
    ).toBeInTheDocument();
    expect(screen.getByText(/genre:/i)).toHaveTextContent('Genre: Documentary');
  });

  test('it displays the search result total', async () => {
    getMovies.mockResolvedValue(emptyResponse(126));

    renderList('/search/Alpha');

    expect(
      await screen.findByRole('heading', { name: '126 movies found' })
    ).toBeInTheDocument();
    expect(screen.getByText(/search:/i)).toHaveTextContent('Search: "Alpha"');
  });

  test('it updates the total when a genre filter changes and is cleared', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce(emptyResponse(20_001))
      .mockResolvedValueOnce(emptyResponse(837))
      .mockResolvedValueOnce(emptyResponse(20_001));

    render(
      <MemoryRouter initialEntries={['/search']}>
        <Link to="?filter=documentary">Documentary</Link>
        <Link to="/search">All</Link>
        <Routes>
          <Route path="/search/:searchQuery?" element={<List />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: '20001 movies found' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Documentary' }));
    expect(
      await screen.findByRole('heading', { name: '837 movies found' })
    ).toBeInTheDocument();
    expect(screen.getByText(/genre:/i)).toHaveTextContent('Genre: Documentary');

    await user.click(screen.getByRole('link', { name: 'All' }));
    expect(
      await screen.findByRole('heading', { name: '20001 movies found' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/genre:/i)).toBeNull();
  });

  test('it updates and clears the active search context', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce(emptyResponse(126))
      .mockResolvedValueOnce(emptyResponse(20_001));

    render(
      <MemoryRouter initialEntries={['/search/Alien']}>
        <Link to="/search">Clear search</Link>
        <Routes>
          <Route path="/search/:searchQuery?" element={<List />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/search:/i)).toHaveTextContent(
      'Search: "Alien"'
    );

    await user.click(screen.getByRole('link', { name: 'Clear search' }));
    expect(
      await screen.findByRole('heading', { name: '20001 movies found' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/search:/i)).toBeNull();
  });

  test('it displays an error message when the fetch fails', async () => {
    getMovies.mockRejectedValue(new Error('Failed to fetch movies'));

    renderList();

    await waitFor(() =>
      expect(screen.getByText('Unable to load movies')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Something went wrong while loading movies.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to fetch movies/)
    ).not.toBeInTheDocument();
  });

  test('it retries loading movies from the error state', async () => {
    const user = userEvent.setup();

    getMovies
      .mockRejectedValueOnce(new Error('Failed to fetch movies'))
      .mockResolvedValueOnce({
        movies: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
      });

    renderList();

    await screen.findByText('Unable to load movies');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('No movies available.')).toBeInTheDocument();
    expect(getMovies).toHaveBeenCalledTimes(2);
  });

  test('it displays an empty state for searches with no results', async () => {
    getMovies.mockResolvedValue({
      movies: [],
      totalResults: 0,
      page: 1,
      totalPages: 0,
    });

    renderList('/search/Nope');

    expect(
      await screen.findByText('No movies found for "Nope".')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '0 movies found' })
    ).toBeInTheDocument();
  });

  test('loads the next page, appends movies, and removes overlapping ids', async () => {
    const user = userEvent.setup();
    const firstMovie = {
      id: 1,
      title: 'First movie',
      releaseDate: '2020-01-01',
      posterUrl: '',
      genres: ['Drama'],
    };
    const secondMovie = { ...firstMovie, id: 2, title: 'Second movie' };
    getMovies
      .mockResolvedValueOnce({
        movies: [firstMovie],
        page: 1,
        totalPages: 2,
        totalResults: 2,
      })
      .mockResolvedValueOnce({
        movies: [firstMovie, secondMovie],
        page: 2,
        totalPages: 2,
        totalResults: 2,
      });

    renderList();
    await screen.findByText('First movie');
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Second movie')).toBeInTheDocument();
    expect(screen.getAllByText('First movie')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(screen.getByText('2 movies loaded')).toBeInTheDocument();
  });

  test('keeps loaded movies and offers retry when a later page fails', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce({
        movies: [
          {
            id: 1,
            title: 'First movie',
            releaseDate: '2020-01-01',
            posterUrl: '',
            genres: [],
          },
        ],
        page: 1,
        totalPages: 2,
        totalResults: 2,
      })
      .mockRejectedValueOnce(new Error('page failed'))
      .mockResolvedValueOnce({
        movies: [],
        page: 2,
        totalPages: 2,
        totalResults: 2,
      });

    renderList();
    await user.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load more movies.'
    );
    expect(screen.getByText('First movie')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getMovies).toHaveBeenCalledTimes(3));
    expect(screen.getByText('First movie')).toBeInTheDocument();
  });
});
