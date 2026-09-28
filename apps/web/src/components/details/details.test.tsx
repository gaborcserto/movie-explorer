import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams as originalUseParams } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import Details from './details';
import {
  getMovie as originalGetMovie,
  isNotFoundError as originalIsNotFoundError,
} from '../../util/apiUtils';

const getMovie = originalGetMovie as jest.Mock;
const isNotFoundError = originalIsNotFoundError as jest.Mock;
const useParams = originalUseParams as jest.Mock;

const mockData: MovieDetails = {
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
};

jest.mock('../../util/apiUtils');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  Link: jest.fn(() => null),
}));

describe('<Details />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isNotFoundError.mockReturnValue(false);
  });

  it('displays the loading component while fetching data', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockReturnValueOnce(
      // eslint-disable-next-line no-promise-executor-return
      new Promise((res) => setTimeout(() => res(mockData), 1000))
    );

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
    expect(getMovie).toHaveBeenCalledWith(1234);
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
    getMovie.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

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
