import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import DetailRecommendations from '.';
import { getMovieCollection, getRelatedTitles } from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/apiUtils')>()),
  getMovieCollection: vi.fn(),
  getRelatedTitles: vi.fn(),
}));

it('renders merged results in one Similar Movies carousel without fetching a collection', async () => {
  vi.mocked(getRelatedTitles).mockResolvedValue({
    availability: 'available',
    results: [2, 3, 4].map((id) => ({
      mediaType: 'movie',
      id,
      title: `Movie ${id}`,
      posterUrl: id === 2 ? undefined : '/poster.jpg',
    })),
  });
  render(
    <MemoryRouter>
      <DetailRecommendations resource="movies" id={1} />
    </MemoryRouter>
  );

  await screen.findByRole('link', { name: /Movie 2/ });
  const row = screen.getByRole('region', { name: 'Similar Movies' });

  expect(
    within(row)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/movie/2', '/movie/3', '/movie/4']);
  expect(
    screen.queryByText('More from this Collection')
  ).not.toBeInTheDocument();
  expect(getMovieCollection).not.toHaveBeenCalled();
});
