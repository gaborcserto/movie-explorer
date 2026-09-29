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
  total,
  offset: 0,
  limit: 10,
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
      total: 2,
      offset: 0,
      limit: 10,
    };

    getMovies.mockResolvedValue(mockMovies);

    renderList('/search/Movie?filter=crime&sorting=releaseDate&order=desc');

    await waitFor(() => {
      const h2Element = screen.getByText(/movies found/i);
      expect(h2Element).toBeInTheDocument();

      const strongElement = document.querySelector('strong');
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe('2');
    });

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText(/showing:/i)).toHaveTextContent('Crime');
    expect(screen.getByText(/search:/i)).toHaveTextContent('"Movie"');
    expect(getMovies).toHaveBeenCalledWith({
      sort: null,
      sortOrder: null,
      search: 'Movie',
      genres: 'crime',
    });
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
    expect(screen.getByText(/showing:/i)).toHaveTextContent(
      'Showing: Documentary'
    );
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
    expect(screen.getByText(/showing:/i)).toHaveTextContent(
      'Showing: Documentary'
    );

    await user.click(screen.getByRole('link', { name: 'All' }));
    expect(
      await screen.findByRole('heading', { name: '20001 movies found' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/showing:/i)).toBeNull();
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
        total: 0,
        offset: 0,
        limit: 10,
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
      total: 0,
      offset: 0,
      limit: 10,
    });

    renderList('/search/Nope');

    expect(
      await screen.findByText('No movies found for "Nope".')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '0 movies found' })
    ).toBeInTheDocument();
  });
});
