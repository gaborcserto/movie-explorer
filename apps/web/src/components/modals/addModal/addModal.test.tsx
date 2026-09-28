import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddModal from './addModal';
import { postMovie as originalPostMovie } from '../../../util/apiUtils';

const postMovie = originalPostMovie as jest.Mock;

jest.mock('../../../util/apiUtils');

const defaultProps = {
  onLoadingChange: jest.fn(),
  onError: jest.fn(),
  onSuccess: jest.fn(),
};

describe('AddModal component', () => {
  beforeEach(() => {
    postMovie.mockResolvedValueOnce({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the postMovie API on form submission', async () => {
    render(<AddModal {...defaultProps} />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Test Movie');
    await userEvent.type(screen.getByLabelText(/release date/i), '2021-01-01');
    await userEvent.type(screen.getByLabelText(/movie url/i), 'example.com');
    await userEvent.type(screen.getByLabelText(/rating/i), '5');
    await userEvent.type(screen.getByLabelText(/runtime/i), '60');
    await userEvent.type(
      screen.getByLabelText(/overview/i),
      'Test description'
    );

    await userEvent.click(screen.getByText('Select Genre'));

    await userEvent.click(screen.getByText('Crime'));

    await userEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(postMovie).toHaveBeenCalled();
    });
  });

  it('shows validation messages when trying to submit an empty form', async () => {
    render(<AddModal {...defaultProps} />);

    const titleInput = screen.getByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const alert = screen.getByText('Movie title is required');
      expect(alert).toBeInTheDocument();
    });
  });
});
