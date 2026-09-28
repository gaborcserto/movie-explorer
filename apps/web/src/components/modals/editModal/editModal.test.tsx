import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditModal from './editModal';
import { putMovie as originalPutMovie } from '../../../util/apiUtils';

const putMovie = vi.mocked(originalPutMovie);

vi.mock('../../../util/apiUtils');

describe('EditModal component', () => {
  const mockMovieData = {
    id: 1,
    title: 'Mock Movie Title',
    releaseDate: '2021-01-01',
    posterUrl: 'https://test.com/movie.jpg',
    rating: 8,
    genres: ['Action', 'Drama'],
    runtimeMinutes: 120,
    description: 'Test overview',
  };
  const defaultProps = {
    movieData: mockMovieData,
    onLoadingChange: vi.fn(),
    onError: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    putMovie.mockResolvedValueOnce(mockMovieData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call the putMovie API on form submission', async () => {
    render(<EditModal {...defaultProps} />);

    const saveButton = screen.getByText('Submit');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(putMovie).toHaveBeenCalledWith(mockMovieData);
    });
  });

  it('shows validation messages when trying to submit an empty form', async () => {
    render(<EditModal {...defaultProps} />);

    const titleInput = screen.getByLabelText('Title');
    await userEvent.clear(titleInput);

    const saveButton = screen.getByText('Submit');
    fireEvent.click(saveButton);

    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert');
      expect(alerts[0]).toHaveTextContent('Movie title is require');
    });
  });
});
