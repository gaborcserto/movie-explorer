import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import { getMovie as originalGetMovie } from '../../util/apiUtils';
import Card from './card';

const getMovie = originalGetMovie as jest.Mock;

jest.mock('../../util/apiUtils');

const mockMovie: MovieDetails = {
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
  let onEditMovie: jest.Mock;
  let onDeleteMovie: jest.Mock;
  let onMovieActionError: jest.Mock;

  beforeEach(() => {
    onEditMovie = jest.fn();
    onDeleteMovie = jest.fn();
    onMovieActionError = jest.fn();
    getMovie.mockResolvedValue(mockMovie);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the card title', () => {
    render(
      <MemoryRouter>
        <Card
          movie={mockMovie}
          onEditMovie={onEditMovie}
          onDeleteMovie={onDeleteMovie}
          onMovieActionError={onMovieActionError}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(mockMovie.title)).toBeInTheDocument();
  });

  it('opens the menu when the menu button is clicked', () => {
    render(
      <MemoryRouter>
        <Card
          movie={mockMovie}
          onEditMovie={onEditMovie}
          onDeleteMovie={onDeleteMovie}
          onMovieActionError={onMovieActionError}
        />
      </MemoryRouter>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('opens the edit modal when handleOpenModal is called', async () => {
    render(
      <MemoryRouter>
        <Card
          movie={mockMovie}
          onEditMovie={onEditMovie}
          onDeleteMovie={onDeleteMovie}
          onMovieActionError={onMovieActionError}
        />
      </MemoryRouter>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(getMovie).toHaveBeenCalledWith(1234);
    await waitFor(() => {
      expect(onEditMovie).toHaveBeenCalledWith(mockMovie);
    });
  });

  it('opens the delete modal when handleDeleteModal is called', () => {
    render(
      <MemoryRouter>
        <Card
          movie={mockMovie}
          onEditMovie={onEditMovie}
          onDeleteMovie={onDeleteMovie}
          onMovieActionError={onMovieActionError}
        />
      </MemoryRouter>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(onDeleteMovie).toHaveBeenCalledWith(mockMovie);
  });
});
