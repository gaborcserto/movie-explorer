import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteModal from './deleteModal';
import { deleteMovie as originalDeleteMovie } from '../../../util/apiUtils';

const deleteMovie = originalDeleteMovie as jest.Mock;

jest.mock('../../../util/apiUtils');

describe('DeleteModal component', () => {
  const defaultProps = {
    movieData: {
      id: 1,
      title: 'Test',
      releaseDate: '2020-01-01',
      posterUrl: '',
      genres: [],
    },
    onLoadingChange: jest.fn(),
    onError: jest.fn(),
    onSuccess: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the deleteMovie API on confirm button click', async () => {
    deleteMovie.mockResolvedValueOnce({});

    render(<DeleteModal {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteMovie).toHaveBeenCalledWith(1);
    });
  });
});
