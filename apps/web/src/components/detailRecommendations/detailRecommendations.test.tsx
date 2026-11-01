import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { MovieDetails, SeriesDetails } from '@movie-explorer/contracts';

import Details from '../details';
import SeriesPage from '../../pages/seriesPage';
import DiscoverPage from '../../pages/homePage/discover';
import * as api from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/apiUtils')>()),
  getMovie: vi.fn(),
  getSeries: vi.fn(),
  getRatings: vi.fn(),
  getWatchProviders: vi.fn(),
  getRelatedTitles: vi.fn(),
  getDiscoverySection: vi.fn(),
  getStreamingProviders: vi.fn(),
  getStreamingProviderSection: vi.fn(),
  getRecommendations: vi.fn(),
}));

const movie: MovieDetails = {
  id: 1,
  title: 'Primary movie',
  posterUrl: '',
  cast: [],
  genres: [],
  backdrops: [{ thumbnailUrl: '/photo.jpg', fullUrl: '/photo.jpg' }],
};
const series: SeriesDetails = {
  mediaType: 'tv',
  id: 1,
  title: 'Primary series',
  originalTitle: null,
  firstAirDate: null,
  posterUrl: null,
  genres: [],
  description: null,
  originalLanguage: null,
  status: null,
  inProduction: null,
  lastAirDate: null,
  seasonCount: null,
  episodeCount: null,
  episodeRuntimeMinutes: [],
  rating: null,
  backdropUrl: null,
  voteCount: null,
  originCountries: [],
  creators: [],
  networks: [],
  productionCompanies: [],
  seasons: [],
  images: {
    backdrops: [{ thumbnailUrl: '/photo.jpg', fullUrl: '/photo.jpg' }],
    posters: [],
    sections: {
      backdrops: { status: 'available' },
      posters: { status: 'available' },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getMovie).mockResolvedValue(movie);
  vi.mocked(api.getSeries).mockResolvedValue(series);
  vi.mocked(api.getRatings).mockResolvedValue({
    tmdb: { status: 'missing' },
    imdb: { status: 'missing' },
  });
  vi.mocked(api.getWatchProviders).mockResolvedValue({ providers: [] });
  vi.mocked(api.getRelatedTitles).mockImplementation(
    () => new Promise(() => {})
  );
});

it.each(['movies', 'series'] as const)(
  'places only the %s Similar section immediately after Media without blocking primary details',
  async (resource) => {
    const path = resource === 'movies' ? '/movie/1' : '/series/1';
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/movie/:movieId" element={<Details />} />
          <Route path="/series/:id" element={<SeriesPage />} />
        </Routes>
      </MemoryRouter>
    );
    const label = resource === 'movies' ? 'Movies' : 'Series';

    expect(
      await screen.findByRole('heading', {
        name: resource === 'movies' ? movie.title : series.title,
      })
    ).toBeVisible();
    await waitFor(() => expect(api.getRelatedTitles).toHaveBeenCalledTimes(1));
    const headings = Array.from(container.querySelectorAll('h2')).map(
      (node) => node.textContent
    );
    const media = headings.indexOf('Media');

    expect(
      screen.queryByRole('heading', { name: `Recommended ${label}` })
    ).toBeNull();
    expect(media).toBeGreaterThan(-1);
    expect(headings.slice(media, media + 2)).toEqual([
      'Media',
      `Similar ${label}`,
    ]);
    if (resource === 'series') {
      expect(headings.indexOf('Seasons')).toBeGreaterThan(
        headings.indexOf('Similar Series')
      );
    }
    expect(api.getRelatedTitles).toHaveBeenCalledWith(
      resource,
      1,
      'similar',
      expect.any(AbortSignal)
    );
    expect(api.getRelatedTitles).not.toHaveBeenCalledWith(
      resource,
      1,
      'recommendations',
      expect.any(AbortSignal)
    );
  }
);

it('does not request optional rows before primary details succeed', async () => {
  let finish: ((value: MovieDetails) => void) | undefined;
  vi.mocked(api.getMovie).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render(
    <MemoryRouter initialEntries={['/movie/1']}>
      <Routes>
        <Route path="/movie/:movieId" element={<Details />} />
      </Routes>
    </MemoryRouter>
  );
  expect(api.getRelatedTitles).not.toHaveBeenCalled();
  await act(async () => {
    finish?.(movie);
  });
  await waitFor(() => expect(api.getRelatedTitles).toHaveBeenCalledTimes(1));
});

it('adds recommendations after existing Streaming in the real homepage composition', async () => {
  const empty = { results: [], page: 1, totalPages: 0, totalResults: 0 };
  vi.mocked(api.getDiscoverySection).mockResolvedValue(empty);
  vi.mocked(api.getStreamingProviders).mockResolvedValue([]);
  vi.mocked(api.getStreamingProviderSection).mockResolvedValue(empty);
  vi.mocked(api.getRecommendations).mockImplementation(async (category) => ({
    category,
    results: [],
    availability: 'available',
    candidateCount: 0,
  }));
  const { container } = render(
    <MemoryRouter>
      <DiscoverPage />
    </MemoryRouter>
  );
  await waitFor(() => expect(api.getRecommendations).toHaveBeenCalledTimes(1));
  const headings = Array.from(container.querySelectorAll('h2')).map((node) =>
    node.textContent?.trim()
  );

  expect(headings).toEqual([
    'Find your next favorite.',
    'Movies',
    'Series',
    'Streaming',
    'Recommendations',
  ]);
  expect(
    Array.from(container.querySelectorAll('.recommendation-row h4')).map(
      (node) => node.textContent
    )
  ).toEqual(['Popular Movies']);
});
