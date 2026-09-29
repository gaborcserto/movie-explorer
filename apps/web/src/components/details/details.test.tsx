import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams as originalUseParams } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import Details from './details';
import DetailsContent from './detailsContent';
import {
  getMovie as originalGetMovie,
  isNotFoundError as originalIsNotFoundError,
} from '../../util/apiUtils';

const getMovie = vi.mocked(originalGetMovie);
const isNotFoundError = vi.mocked(originalIsNotFoundError);
const useParams = vi.mocked(originalUseParams);

const mockData: MovieDetails = {
  cast: ['Actor One', 'Actor Two'],
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
  director: 'Director Name',
};

vi.mock('../../util/apiUtils');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )),
  useParams: vi.fn(),
  Link: vi.fn(() => null),
}));

describe('<Details />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNotFoundError.mockReturnValue(false);
  });

  it('displays the loading component while fetching data', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockReturnValueOnce(new Promise(() => {}));

    render(<Details />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays movie data once it is fetched', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockResolvedValueOnce(mockData);

    render(<Details />);

    await waitFor(() => {
      expect(screen.getByText('Sample Movie')).toBeInTheDocument();
      expect(screen.getByText(8.5)).toBeInTheDocument();
      expect(screen.getByText('Drama, Action')).toBeInTheDocument();
      expect(screen.getByText('2021')).toBeInTheDocument();
      expect(screen.getByText('120 min')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(screen.getByText('Director Name')).toBeVisible();
    expect(screen.getByText('Actor One · Actor Two')).toBeVisible();
    expect(getMovie).toHaveBeenCalledWith(1234);
  });

  it('omits unavailable and invalid metadata', () => {
    render(
      <DetailsContent
        movieData={{
          ...mockData,
          cast: [],
          description: '',
          director: undefined,
          genres: [],
          rating: undefined,
          releaseDate: '',
          runtimeMinutes: 0,
        }}
      />
    );

    expect(screen.queryByText('0 min')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credits' })).toBeNull();
    expect(screen.queryByLabelText(/rating/i)).toBeNull();
  });

  it('handles errors and shows an error message when fetching fails', async () => {
    useParams.mockReturnValue({ movieId: '12' });
    getMovie.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<Details />);
    await waitFor(() =>
      expect(screen.getByText('Unable to load movie')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Something went wrong while loading this movie.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('shows a not-found state for missing movies', async () => {
    useParams.mockReturnValue({ movieId: '404' });
    isNotFoundError.mockReturnValue(true);
    getMovie.mockRejectedValueOnce(new Error('Movie not found'));

    render(<Details />);

    expect(await screen.findByText('Movie not found')).toBeInTheDocument();
    expect(
      screen.getByText('We could not find that movie.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('shows a not-found state for invalid movie IDs', async () => {
    useParams.mockReturnValue({ movieId: 'unknown' });

    render(<Details />);

    expect(await screen.findByText('Movie not found')).toBeInTheDocument();
    expect(getMovie).not.toHaveBeenCalled();
  });

  it('retries loading movie details from a generic error state', async () => {
    const user = userEvent.setup();

    useParams.mockReturnValue({ movieId: '1234' });
    getMovie
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(mockData);

    render(<Details />);

    await screen.findByText('Unable to load movie');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
    expect(getMovie).toHaveBeenCalledTimes(2);
  });
});
