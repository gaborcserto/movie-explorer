import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteModal from './deleteModal';
import { deleteMovie as originalDeleteMovie } from '../../../util/apiUtils';

const deleteMovie = vi.mocked(originalDeleteMovie);

vi.mock('../../../util/apiUtils');

describe('DeleteModal component', () => {
  const defaultProps = {
    movieData: {
      id: 1,
      title: 'Test',
      releaseDate: '2020-01-01',
      posterUrl: '',
      genres: [],
    },
    onLoadingChange: vi.fn(),
    onError: vi.fn(),
    onSuccess: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call the deleteMovie API on confirm button click', async () => {
    deleteMovie.mockResolvedValueOnce(undefined);

    render(<DeleteModal {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteMovie).toHaveBeenCalledWith(1);
    });
  });
});
