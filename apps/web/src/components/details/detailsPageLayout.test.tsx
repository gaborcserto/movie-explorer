import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import DetailsPageLayout from './detailsPageLayout';
import { DetailsHero, DetailsLowerContent } from './detailsContent';

vi.mock('../search/headerSearch', () => ({
  default: () => <button type="button">Search</button>,
}));

test('preserves Movie navigation, hero, title, rating, overview and lower-content structure', () => {
  const movie = {
    id: 1,
    title: 'Movie reference',
    cast: ['Actor'],
    posterUrl: '/poster.jpg',
    genres: ['Drama'],
    releaseDate: '2020-01-01',
    runtimeMinutes: 123,
    rating: 8.5,
    description: 'Overview text',
  };
  const { container } = render(
    <MemoryRouter>
      <DetailsPageLayout
        title={movie.title}
        hero={<DetailsHero movieData={movie} />}
      >
        <DetailsLowerContent movieData={movie} />
      </DetailsPageLayout>
    </MemoryRouter>
  );
  const main = screen.getByRole('main', { name: movie.title });
  expect(main).toHaveFocus();
  expect(document.title).toBe('Movie reference | Movie Explorer');
  expect(container.querySelector('header')).toHaveClass(
    'detail-page__navigation',
    'movie-details',
    'container'
  );
  const hero = container.querySelector(
    '.detail-page__hero > .movie-details.container > .movie-details__container'
  );
  expect(hero?.firstElementChild).toHaveClass('movie-details__image');
  expect(hero?.lastElementChild).toHaveClass('movie-details__content');
  expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
    'movie-details__title'
  );
  expect(
    screen
      .getByLabelText('TMDB rating: 8.5 out of 10')
      .closest('.movie-details__title__wrapper')
  ).toHaveClass('movie-details__title__wrapper');
  expect(screen.getByText('2020').parentElement).toHaveClass(
    'movie-details__data'
  );
  expect(screen.getByText('123 min').parentElement).toHaveClass(
    'movie-details__data'
  );
  expect(screen.getByText('Overview text')).toHaveClass(
    'movie-details__overview'
  );
  expect(
    screen.getByRole('region', { name: 'Cast' }).closest('.container')
  ).toHaveClass('movie-details__lower-content');
});
