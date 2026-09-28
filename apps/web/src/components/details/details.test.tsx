import { render, screen, waitFor } from '@testing-library/react';
import { useParams as originalUseParams } from 'react-router-dom';
import Details from './details';
import { getMovie as originalGetMovie } from '../../util/apiUtils';
import { Movie } from '../../types';

const getMovie = originalGetMovie as jest.Mock;
const useParams = originalUseParams as jest.Mock;

const mockData: Movie = {
  id: 1234,
  title: 'Sample Movie',
  tagline: 'Sample Tagline',
  release_date: '2021-01-01',
  poster_path: '/sample.jpg',
  genres: ['Drama', 'Action'],
  vote_average: 8.5,
  vote_count: 100,
  budget: 1000,
  revenue: 1200,
  runtime: 120,
  overview: 'A sample movie for testing purposes.',
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
  });

  it('displays the loading component while fetching data', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockReturnValueOnce(
      // eslint-disable-next-line no-promise-executor-return
      new Promise((res) => setTimeout(() => res({ data: mockData }), 1000))
    );

    render(<Details />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays movie data once it is fetched', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockResolvedValueOnce({ data: mockData });

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
      expect(screen.getByText('Movies not found')).toBeInTheDocument()
    );
  });
});
