import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MovieSummary } from '@movie-explorer/contracts';
import Card from './card';

const mockMovie: MovieSummary = {
  id: 1234,
  title: 'Glenroy Brothers (Comic Boxing)',
  releaseDate: '1894-10-06',
  posterUrl: '/sample.jpg',
  posterSrcSet: '/small.jpg 1x, /large.jpg 2x, /original.jpg 3x',
  genres: ['Documentary', 'Comedy'],
};

describe('<Card />', () => {
  it('renders long titles, year, and genres without mutation actions', () => {
    render(
      <MemoryRouter>
        <Card movie={mockMovie} />
      </MemoryRouter>
    );

    const movieLink = screen.getByRole('link', { name: mockMovie.title });
    expect(movieLink).toBeVisible();
    expect(movieLink).toHaveAttribute('href', '/movie/1234');
    expect(screen.getByText('1894')).toBeVisible();
    expect(screen.getByText('Documentary')).toBeVisible();
    expect(screen.getByText('Comedy')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByAltText(mockMovie.title)).toHaveAttribute(
      'srcset',
      mockMovie.posterSrcSet
    );
  });

  it('renders a movie without optional release date metadata', () => {
    const { releaseDate: _releaseDate, ...movieWithoutReleaseDate } = mockMovie;

    render(
      <MemoryRouter>
        <Card movie={movieWithoutReleaseDate} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: mockMovie.title })).toBeVisible();
    expect(screen.getByText(mockMovie.title)).toBeVisible();
    expect(screen.queryByText('1894')).not.toBeInTheDocument();
  });
});
