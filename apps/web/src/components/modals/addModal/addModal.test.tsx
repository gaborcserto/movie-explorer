import { render, screen, waitFor } from '@testing-library/react';
import { Provider, useDispatch as originalUseDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import modalReducer from '../../../reducer/modalSlice';
import moviesReducer from '../../../reducer/moviesSlice';
import AddModal from './addModal'; // Update the path accordingly
import { postMovie as originalPostMovie } from '../../../util/apiUtils';

const mockStore = configureStore({
  reducer: {
    movies: moviesReducer,
    modal: modalReducer,
  },
});

const useDispatch = originalUseDispatch as jest.Mock;
const postMovie = originalPostMovie as jest.Mock;

jest.mock('../../../util/apiUtils');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('AddModal component', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    postMovie.mockResolvedValueOnce({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the postMovie API on form submission', async () => {
    render(
      <Provider store={mockStore}>
        <AddModal />
      </Provider>
    );

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
    render(
      <Provider store={mockStore}>
        <AddModal />
      </Provider>
    );

    const titleInput = screen.getByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      const alert = screen.getByText('Movie title is required');
      expect(alert).toBeInTheDocument();
    });
  });
});
