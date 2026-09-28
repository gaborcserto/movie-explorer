import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Provider,
  useSelector as originalUseSelector,
  useDispatch as originalUseDispatch,
} from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import modalReducer from '../../../reducer/modalSlice';
import moviesReducer from '../../../reducer/moviesSlice';
import EditModal from './editModal'; // Update the path accordingly
import { putMovie as originalPutMovie } from '../../../util/apiUtils';

const mockStore = configureStore({
  reducer: {
    movies: moviesReducer,
    modal: modalReducer,
  },
});

const useSelector = originalUseSelector as jest.Mock;
const useDispatch = originalUseDispatch as jest.Mock;
const putMovie = originalPutMovie as jest.Mock;

jest.mock('../../../util/apiUtils');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('EditModal component', () => {
  let mockDispatch: jest.Mock;
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

  beforeEach(() => {
    mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    (useSelector as jest.Mock).mockImplementation((callback) => {
      return callback({ modal: { movie: mockMovieData } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the putMovie API on form submission', async () => {
    putMovie.mockResolvedValueOnce({});

    render(
      <Provider store={mockStore}>
        <EditModal />
      </Provider>
    );

    // For simplicity, I'm assuming your form has a submit button with "Save" as its text
    const saveButton = screen.getByText('Submit');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(putMovie).toHaveBeenCalledWith(mockMovieData);
    });
  });

  it('shows validation messages when trying to submit an empty form', async () => {
    putMovie.mockResolvedValueOnce({});

    render(
      <Provider store={mockStore}>
        <EditModal />
      </Provider>
    );

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
