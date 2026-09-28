import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, useDispatch as originalUseDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import modalReducer, {
  setModalOpen,
  setModalType,
} from '../../reducer/modalSlice';
import { getMovie as originalGetMovie } from '../../util/apiUtils';
import Card from './card';
import { Movie } from '../../types';

const useDispatch = originalUseDispatch as jest.Mock;
const getMovie = originalGetMovie as jest.Mock;

const mockStore = configureStore({
  reducer: {
    modal: modalReducer,
  },
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));
jest.mock('../../util/apiUtils');

const mockMovie: Movie = {
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
};

describe('<Card />', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
    getMovie.mockResolvedValue({ data: mockMovie });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the card title', () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <Card movie={mockMovie} />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
  });

  it('opens the menu when the menu button is clicked', () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <Card movie={mockMovie} />
        </MemoryRouter>
      </Provider>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('opens the edit modal when handleOpenModal is called', async () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <Card movie={mockMovie} />
        </MemoryRouter>
      </Provider>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(getMovie).toHaveBeenCalledWith(1234);
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setModalOpen(true));
      expect(mockDispatch).toHaveBeenCalledWith(setModalType('edit'));
    });
  });

  it('opens the delete modal when handleDeleteModal is called', () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <Card movie={mockMovie} />
        </MemoryRouter>
      </Provider>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockDispatch).toHaveBeenCalledWith(setModalOpen(true));
    expect(mockDispatch).toHaveBeenCalledWith(setModalType('delete'));
  });
});
