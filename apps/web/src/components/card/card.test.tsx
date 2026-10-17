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
  it('preserves search context and genre navigation by default', () => {
    render(
      <MemoryRouter initialEntries={['/search?sorting=title&filter=comedy']}>
        <Card movie={mockMovie} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: mockMovie.title })).toHaveAttribute(
      'href',
      '/movie/1234?sorting=title&filter=comedy'
    );
    expect(screen.getByRole('link', { name: 'Documentary' })).toHaveAttribute(
      'href',
      '/search?sorting=title&filter=documentary'
    );
  });

  it('accepts an explicit destination, subtitle, and static genres', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/person/42?personView=crew&personRole=job%3ADirector',
        ]}
      >
        <Card
          movie={mockMovie}
          destination="/movie/1234"
          subtitle="Director"
          genreNavigation={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: mockMovie.title })).toHaveAttribute(
      'href',
      '/movie/1234'
    );
    expect(screen.getByText('Director')).toBeVisible();
    expect(screen.getByText('Documentary, Comedy')).toBeVisible();
    expect(screen.getByText('Documentary, Comedy')).toHaveClass(
      'card__type--static'
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

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
