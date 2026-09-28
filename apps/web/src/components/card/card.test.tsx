import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider, useDispatch as originalUseDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import modalReducer, {
  setModalOpen,
  setModalType,
} from '../../reducer/modalSlice';
import Card from './card';
import { Movie } from '../../types';

const useDispatch = originalUseDispatch as jest.Mock;

const mockStore = configureStore({
  reducer: {
    modal: modalReducer,
  },
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

const mockMovie: Movie = {
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

describe('<Card />', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    useDispatch.mockReturnValue(mockDispatch);
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

  it('opens the edit modal when handleOpenModal is called', () => {
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

    expect(mockDispatch).toHaveBeenCalledWith(setModalOpen(true));
    expect(mockDispatch).toHaveBeenCalledWith(setModalType('edit'));
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
