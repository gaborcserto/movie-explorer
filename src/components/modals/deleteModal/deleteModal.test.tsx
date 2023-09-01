import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Provider,
  useSelector as originalUseSelector,
  useDispatch as originalUseDispatch,
} from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import modalReducer from '../../../reducer/modalSlice';
import moviesReducer from '../../../reducer/moviesSlice';
import DeleteModal from './deleteModal';
import { deleteMovie as originalDeleteMovie } from '../../../util/apiUtils';

const mockStore = configureStore({
  reducer: {
    movies: moviesReducer,
    modal: modalReducer,
  },
});

const useSelector = originalUseSelector as jest.Mock;
const useDispatch = originalUseDispatch as jest.Mock;
const deleteMovie = originalDeleteMovie as jest.Mock;

jest.mock('../../../util/apiUtils');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('DeleteModal component', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    (useSelector as jest.Mock).mockImplementation((callback) => {
      return callback({ modal: { movie: { id: 1 } } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the deleteMovie API on confirm button click', async () => {
    deleteMovie.mockResolvedValueOnce({});

    render(
      <Provider store={mockStore}>
        <DeleteModal />
      </Provider>
    );

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteMovie).toHaveBeenCalledWith(1);
    });
  });
});
