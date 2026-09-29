import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import App from './App';
import {
  getMovie as originalGetMovie,
  getMovies as originalGetMovies,
} from './util/apiUtils';

vi.mock('./util/apiUtils');

const getMovie = vi.mocked(originalGetMovie);
const getMovies = vi.mocked(originalGetMovies);

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
  total: 1,
  offset: 0,
  limit: 10,
};

const renderApp = (initialEntry = '/search') => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
};

describe('<App />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMovies.mockResolvedValue(moviesResponse);
    getMovie.mockResolvedValue(movie);
  });

  test('renders the search route and loaded movie results', async () => {
    renderApp('/search');

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Movie Explorer' })
    ).toHaveLength(2);
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

    expect(getMovies).toHaveBeenLastCalledWith({
      sort: null,
      sortOrder: null,
      search: 'Inception',
      genres: null,
    });
  });

  test('renders movie details for movie routes', async () => {
    renderApp('/movie/1234');

    expect(
      await screen.findByRole('heading', { name: 'Sample Movie' })
    ).toBeInTheDocument();
    expect(screen.getByText('Drama, Action')).toBeInTheDocument();
    expect(getMovie).toHaveBeenCalledWith(1234);
  });

  test('displays the 404 error page for non-existent routes', () => {
    renderApp('/non-existent-route');

    expect(screen.getByText('404 Error')).toBeInTheDocument();
  });
});
