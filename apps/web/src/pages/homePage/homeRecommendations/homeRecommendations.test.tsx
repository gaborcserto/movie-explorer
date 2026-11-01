import { StrictMode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import HomeRecommendations from '.';
import { getRecommendations } from '../../../util/apiUtils';
import { ApiRequestError } from '../../../util/apiErrors';

vi.mock('../../../util/apiUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../util/apiUtils')>()),
  getRecommendations: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRecommendations).mockImplementation(async (category) => ({
    category,
    availability: 'available',
    candidateCount: 1,
    results: [
      {
        id: category.startsWith('popular') ? 2 : 3,
        mediaType: category.endsWith('movies') ? 'movie' : 'tv',
        title: category,
        posterUrl: '/poster.jpg',
      },
    ],
  }));
});

function recommendationTabs() {
  return within(
    screen.getByRole('tablist', { name: 'Recommendation categories' })
  );
}

it('shows one compass heading and lazily retains Movies/Series results and scroll state', async () => {
  const { container } = render(
    <StrictMode>
      <MemoryRouter>
        <HomeRecommendations />
      </MemoryRouter>
    </StrictMode>
  );
  const heading = screen.getByRole('heading', {
    name: 'Recommendations',
    level: 2,
  });
  expect(
    screen.getAllByRole('heading', { name: 'Recommendations' })
  ).toHaveLength(1);
  expect(heading.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelectorAll('h3')).toHaveLength(0);
  expect(recommendationTabs().getAllByRole('tab')).toHaveLength(2);
  expect(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  ).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByText('Top Rated')).toBeNull();
  const movie = await screen.findByRole('link', { name: 'popular-movies' });
  expect(movie).toHaveAttribute('href', '/movie/2');
  expect(getRecommendations).toHaveBeenCalledTimes(1);
  const movieViewport = screen.getByRole('region', {
    name: 'Scroll Popular Movies cards',
  });
  movieViewport.scrollLeft = 125;

  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  const series = await screen.findByRole('link', { name: 'popular-series' });
  expect(series).toHaveAttribute('href', '/series/2');
  expect(screen.queryByRole('link', { name: 'popular-movies' })).toBeNull();
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  const seriesViewport = screen.getByRole('region', {
    name: 'Scroll Popular Series cards',
  });
  seriesViewport.scrollLeft = 75;

  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  );
  expect(screen.getByRole('link', { name: 'popular-movies' })).toBe(movie);
  expect(movieViewport.scrollLeft).toBe(125);
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  expect(screen.getByRole('link', { name: 'popular-series' })).toBe(series);
  expect(seriesViewport.scrollLeft).toBe(75);
  expect(
    screen.getAllByRole('button', { name: /Add to Watchlist/ })
  ).toHaveLength(1);
  expect(
    vi.mocked(getRecommendations).mock.calls.map(([category]) => category)
  ).toEqual(['popular-movies', 'popular-series']);
});

it('preserves keyboard selection, roving focus and accessible panel linkage', async () => {
  render(
    <MemoryRouter>
      <HomeRecommendations />
    </MemoryRouter>
  );
  await screen.findByRole('link', { name: 'popular-movies' });
  recommendationTabs().getByRole('tab', { name: 'Movies' }).focus();

  await userEvent.keyboard('{ArrowRight}');
  expect(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  ).toHaveFocus();
  expect(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  ).toHaveAttribute('aria-selected', 'true');
  expect(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  ).toHaveAttribute('tabindex', '-1');
  await screen.findByRole('link', { name: 'popular-series' });
  await userEvent.keyboard('{Home}{End}{ArrowLeft}{ArrowLeft}');
  expect(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  ).toHaveFocus();
  await userEvent.keyboard('{ArrowRight}');
  expect(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  ).toHaveFocus();
  expect(getRecommendations).toHaveBeenCalledTimes(2);
  const tab = recommendationTabs().getByRole('tab', { name: 'Movies' });
  const panel = document.getElementById(
    tab.getAttribute('aria-controls') ?? ''
  );
  expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  expect(panel).toBeVisible();
});

it('keeps a pending tab request alive and caches its error until explicit retry', async () => {
  let rejectSeries: ((error: unknown) => void) | undefined;
  vi.mocked(getRecommendations).mockImplementation(async (category) => {
    if (category === 'popular-series') {
      return new Promise((_resolve, reject) => {
        rejectSeries = reject;
      });
    }

    return {
      category,
      results: [],
      candidateCount: 0,
      availability: 'available',
    };
  });
  render(
    <MemoryRouter>
      <HomeRecommendations />
    </MemoryRouter>
  );
  await waitFor(() => expect(getRecommendations).toHaveBeenCalledTimes(1));
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  expect(screen.getByText('Loading popular series...')).toBeVisible();
  const signal = vi.mocked(getRecommendations).mock.calls[1][1];
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  );
  expect(signal?.aborted).toBe(false);
  expect(
    within(screen.getByRole('region', { name: 'Popular Movies' })).getByText(
      'No recommendations are available right now.'
    )
  ).toBeVisible();
  await act(async () => {
    rejectSeries?.(new ApiRequestError('network'));
  });
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();

  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  expect(getRecommendations).toHaveBeenCalledTimes(2);
  vi.mocked(getRecommendations).mockResolvedValue({
    category: 'popular-series',
    results: [],
    candidateCount: 0,
    availability: 'available',
  });
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  );
  expect(getRecommendations).toHaveBeenCalledTimes(3);
});
