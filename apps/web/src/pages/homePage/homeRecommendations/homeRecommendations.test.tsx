import { StrictMode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import HomeRecommendations from '.';
import {
  getPersonalizedRecommendations,
  getRecommendations,
} from '../../../util/apiUtils';
import { ApiRequestError } from '../../../util/apiErrors';
import {
  LIBRARY_STORAGE_KEY,
  useLibraryStore,
} from '../../../features/library/libraryStore';

vi.mock('../../../util/apiUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../util/apiUtils')>()),
  getRecommendations: vi.fn(),
  getPersonalizedRecommendations: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useLibraryStore.setState({ items: {} });
  vi.mocked(getPersonalizedRecommendations).mockImplementation(
    async (preferences) => ({
      mediaType: preferences.mediaType,
      source: preferences.favoriteIds.length ? 'favorites' : 'popular',
      availability: 'available',
      results: [
        {
          id: 10,
          mediaType: preferences.mediaType,
          title: `Personalized ${preferences.mediaType}`,
          posterUrl: '/poster.jpg',
        },
      ],
    })
  );
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

function addFavorite(id: number, mediaType: 'movie' | 'tv' = 'movie') {
  useLibraryStore
    .getState()
    .add({ id, mediaType, title: `Seed ${id}` }, 'favorites');
}

function renderHome() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <HomeRecommendations />
      </MemoryRouter>
    </StrictMode>
  );
}

it('personalizes Movies independently and preserves Series Popular and numeric identities', async () => {
  addFavorite(2);
  renderHome();
  expect(
    await screen.findByRole('link', { name: 'Personalized movie' })
  ).toHaveAttribute('href', '/movie/10');
  expect(screen.getByText('Based on your Favorites.')).toBeVisible();
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(1);
  expect(vi.mocked(getPersonalizedRecommendations).mock.calls[0][0]).toEqual({
    mediaType: 'movie',
    favoriteIds: [2],
    excludedIds: [2],
  });

  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  expect(
    await screen.findByRole('link', { name: 'popular-series' })
  ).toHaveAttribute('href', '/series/2');
  expect(getRecommendations).toHaveBeenCalledTimes(1);
});

it('personalizes Series independently and both types when both have Favorites', async () => {
  addFavorite(2, 'tv');
  renderHome();
  await screen.findByRole('link', { name: 'popular-movies' });
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  expect(
    await screen.findByRole('link', { name: 'Personalized tv' })
  ).toHaveAttribute('href', '/series/10');
  const seriesViewport = screen.getByRole('region', {
    name: 'Scroll Popular Series cards',
  });
  seriesViewport.scrollLeft = 80;

  act(() => addFavorite(2));
  await waitFor(() =>
    expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(2)
  );
  expect(seriesViewport.scrollLeft).toBe(80);
  expect(
    vi
      .mocked(getPersonalizedRecommendations)
      .mock.calls.map(([input]) => input.mediaType)
  ).toEqual(['tv', 'movie']);
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  );
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(2);
});

it('responds to card Favorites and Watched actions but does not use Watchlist as a seed', async () => {
  renderHome();
  await screen.findByRole('link', { name: 'popular-movies' });
  await userEvent.click(
    screen.getByRole('button', { name: /Add to Watchlist/ })
  );
  expect(getRecommendations).toHaveBeenCalledTimes(1);
  expect(getPersonalizedRecommendations).not.toHaveBeenCalled();

  await userEvent.click(
    screen.getByRole('button', { name: /Add to Favorites/ })
  );
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(screen.queryByRole('link', { name: 'popular-movies' })).toBeNull();
  await userEvent.click(
    screen.getByRole('button', { name: /Mark as Watched/ })
  );
  await waitFor(() =>
    expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(2)
  );
  expect(screen.queryByRole('link', { name: 'Personalized movie' })).toBeNull();
  expect(vi.mocked(getPersonalizedRecommendations).mock.calls[1][0]).toEqual({
    mediaType: 'movie',
    favoriteIds: [2],
    excludedIds: [2, 10],
  });
});

it('restores Popular after removing the final Favorite without a reload', async () => {
  addFavorite(1);
  renderHome();
  await screen.findByRole('link', { name: 'Personalized movie' });
  act(() => {
    useLibraryStore.getState().remove('movie:1', 'favorites');
  });
  await screen.findByRole('link', { name: 'popular-movies' });
  expect(getRecommendations).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Based on your Favorites.')).toBeNull();
});

it('uses filtered Popular for a Watched-only library and keeps Watchlist eligible', async () => {
  useLibraryStore
    .getState()
    .add({ mediaType: 'movie', id: 1, title: 'Watched' }, 'watched');
  useLibraryStore
    .getState()
    .add({ mediaType: 'movie', id: 10, title: 'Watchlist' }, 'watchlist');
  renderHome();
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(vi.mocked(getPersonalizedRecommendations).mock.calls[0][0]).toEqual({
    mediaType: 'movie',
    favoriteIds: [],
    excludedIds: [1],
  });
  expect(screen.queryByText('Based on your Favorites.')).toBeNull();
});

it('selects bounded, spread-out seeds deterministically and ignores snapshot edits', async () => {
  [9, 1, 7, 3, 5].forEach((id) => addFavorite(id));
  renderHome();
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(vi.mocked(getPersonalizedRecommendations).mock.calls[0][0]).toEqual({
    mediaType: 'movie',
    favoriteIds: [1, 5, 9],
    excludedIds: [1, 3, 5, 7, 9],
  });
  act(() => {
    useLibraryStore
      .getState()
      .updateSnapshot({ mediaType: 'movie', id: 1, title: 'Updated snapshot' });
  });
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(1);
});

it('aborts obsolete personalized work and ignores late responses after preferences change', async () => {
  let finish:
    | ((
        value: Awaited<ReturnType<typeof getPersonalizedRecommendations>>
      ) => void)
    | undefined;
  vi.mocked(getPersonalizedRecommendations).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  addFavorite(1);
  renderHome();
  await waitFor(() =>
    expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(1)
  );
  const signal = vi.mocked(getPersonalizedRecommendations).mock.calls[0][1];
  act(() => {
    useLibraryStore.getState().remove('movie:1', 'favorites');
  });
  await screen.findByRole('link', { name: 'popular-movies' });
  expect(signal?.aborted).toBe(true);

  await act(async () => {
    finish?.({
      mediaType: 'movie',
      source: 'favorites',
      availability: 'available',
      results: [
        {
          id: 99,
          mediaType: 'movie',
          title: 'Stale response',
          posterUrl: '/poster.jpg',
        },
      ],
    });
  });
  expect(screen.queryByRole('link', { name: 'Stale response' })).toBeNull();
  expect(screen.getByRole('link', { name: 'popular-movies' })).toBeVisible();
});

it('retains partial results during independent retry and leaves the other tab intact', async () => {
  addFavorite(1);
  vi.mocked(getPersonalizedRecommendations).mockResolvedValueOnce({
    mediaType: 'movie',
    source: 'mixed',
    availability: 'partial',
    results: [
      {
        id: 10,
        mediaType: 'movie',
        title: 'Partial movie',
        posterUrl: '/poster.jpg',
      },
    ],
  });
  renderHome();
  await screen.findByRole('link', { name: 'Partial movie' });
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Series' })
  );
  await screen.findByRole('link', { name: 'popular-series' });
  await userEvent.click(
    recommendationTabs().getByRole('tab', { name: 'Movies' })
  );
  expect(
    screen.getByText('Some recommendations are unavailable.')
  ).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(getRecommendations).toHaveBeenCalledTimes(1);
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(2);
});

it('rehydrates cross-tab storage changes and invalidates only the affected media type', async () => {
  renderHome();
  await screen.findByRole('link', { name: 'popular-movies' });
  const item = {
    id: 1,
    mediaType: 'movie',
    title: 'External Favorite',
    collections: { favorites: true, watched: false, watchlist: false },
  };
  localStorage.setItem(
    LIBRARY_STORAGE_KEY,
    JSON.stringify({ version: 1, state: { items: { 'movie:1': item } } })
  );
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: LIBRARY_STORAGE_KEY,
        storageArea: localStorage,
      })
    );
  });
  await screen.findByRole('link', { name: 'Personalized movie' });
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(1);

  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'unrelated',
        storageArea: localStorage,
      })
    );
  });
  expect(getPersonalizedRecommendations).toHaveBeenCalledTimes(1);
  localStorage.removeItem(LIBRARY_STORAGE_KEY);
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: LIBRARY_STORAGE_KEY,
        storageArea: localStorage,
      })
    );
  });
  await screen.findByRole('link', { name: 'popular-movies' });
  expect(getRecommendations).toHaveBeenCalledTimes(2);
});
