import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import List from './list';
import { getMovies as originalGetMovies } from '../../util/apiUtils';

const getMovies = vi.mocked(originalGetMovies);
vi.mock('../../util/apiUtils');

const defaultProps = {
  refreshKey: 0,
  onEditMovie: vi.fn(),
  onDeleteMovie: vi.fn(),
  onMovieActionError: vi.fn(),
};

const renderList = (initialEntry = '/search') => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/search/:searchQuery?"
          element={<List {...defaultProps} />}
        />
      </Routes>
    </MemoryRouter>
  );
};

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

    renderList('/search/Movie?filter=crime&sorting=Release Date');

    await waitFor(() => {
      const h2Element = screen.getByText(/movies found/i);
      expect(h2Element).toBeInTheDocument();

      const strongElement = document.querySelector('strong');
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe('2');
    });

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText(/in genre:/i)).toHaveTextContent('Crime');
    expect(getMovies).toHaveBeenCalledWith({
      sort: 'Release Date',
      search: 'Movie',
      genres: 'crime',
    });
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
