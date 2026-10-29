import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  SeriesDetails,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
} from '@movie-explorer/contracts';

import * as apiUtils from '../../util/apiUtils';
import SeriesPage from './seriesPage';
import SeasonPage from './seasonPage';
import EpisodePage from './episodePage';
import { useLibraryStore } from '../../features/library/libraryStore';
import {
  getSeries,
  getSeason,
  getEpisode,
  getEpisodeCredits,
  ApiRequestError,
} from '../../util/apiUtils';

vi.mock('../../components/search/headerSearch', () => ({
  default: () => null,
}));

vi.spyOn(apiUtils, 'getWatchProviders').mockResolvedValue({ providers: [] });
vi.spyOn(apiUtils, 'getRatings').mockResolvedValue({
  tmdb: { status: 'available', score: 8.5, voteCount: 200 },
  imdb: { status: 'missing' },
});

const credits: EpisodeCredits = {
  cast: [{ id: 11, name: 'Regular Actor', characters: ['Guide'] }],
  guestStars: [{ id: 12, name: 'Guest Actor', characters: ['Traveler'] }],
  crew: [
    {
      id: 13,
      name: 'Episode Writer',
      department: 'Writing',
      jobs: ['Writer', 'Story'],
    },
  ],
  sections: {
    cast: { status: 'available' },
    guestStars: { status: 'available' },
    crew: { status: 'available' },
  },
};
const episode: EpisodeDetails = {
  id: 30,
  seriesId: 1,
  seasonNumber: 0,
  episodeNumber: 3,
  title: 'Arrival',
  description: 'A visitor arrives.',
  airDate: '2026-01-02',
  runtimeMinutes: 24,
  stillUrl: null,
  rating: 0,
  voteCount: 0,
  credits,
};
const season: SeasonDetails = {
  id: 10,
  seriesId: 1,
  seasonNumber: 0,
  title: 'Special stories',
  description: null,
  posterUrl: null,
  airDate: null,
  episodeCount: 3,
  episodes: [
    { ...episode, id: 10, episodeNumber: 1, title: 'Beginning' },
    episode,
    { ...episode, id: 80, episodeNumber: 8, title: 'Departure' },
  ],
};
const series: SeriesDetails = {
  mediaType: 'tv',
  id: 1,
  title: 'The Journey',
  originalTitle: 'Original Journey',
  firstAirDate: '2025-01-01',
  posterUrl: null,
  genres: ['Adventure'],
  description: null,
  originalLanguage: 'en',
  status: 'Returning Series',
  inProduction: true,
  lastAirDate: null,
  seasonCount: 2,
  episodeCount: 12,
  episodeRuntimeMinutes: [24],
  rating: 8.5,
  voteCount: 200,
  originCountries: ['US'],
  backdropUrl: null,
  creators: [{ id: 7, name: 'Creator' }],
  networks: [{ id: 9, name: 'Network', logoUrl: null, originCountry: 'US' }],
  productionCompanies: [],
  seasons: [
    { ...season },
    { ...season, id: 50, seasonNumber: 5, title: 'Book Five' },
  ],
};
const fetchMock = vi.fn<typeof fetch>();

function MemoryHistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="current-route">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        History forward
      </button>
    </>
  );
}

function setup(path: string, showHistoryControls = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {showHistoryControls && <MemoryHistoryControls />}
      <Link to="/series/2">Other series</Link>
      <Link to="/series/1/seasons/0/episodes/8">Other episode</Link>
      <Routes>
        <Route path="/series/:id" element={<SeriesPage />} />
        <Route
          path="/series/:id/seasons/:seasonNumber"
          element={<SeasonPage />}
        />
        <Route
          path="/series/:id/seasons/:seasonNumber/episodes/:episodeNumber"
          element={<EpisodePage />}
        />
        <Route path="/person/:id" element={<h1>Person profile</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useLibraryStore.setState({ items: {}, persistenceWarning: null });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;

    if (path.endsWith('/credits')) {
      return Response.json(credits);
    }
    if (path.includes('/episodes/')) {
      const number = Number(path.split('/').at(-1));

      return Response.json({
        ...episode,
        episodeNumber: number,
        title:
          season.episodes.find((item) => item.episodeNumber === number)
            ?.title ?? 'Episode',
      });
    }
    if (path.includes('/seasons/')) {
      const seasonNumber = Number(path.split('/').at(-1));

      return Response.json({
        ...season,
        seasonNumber,
        episodes: season.episodes.map((item) => ({ ...item, seasonNumber })),
      });
    }

    return Response.json(series);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
});

describe('Series hierarchy', () => {
  it.each([
    {
      name: 'Season 1 before Specials in an unordered list',
      seasons: [
        { ...season, id: 50, seasonNumber: 5 },
        { ...season, id: 10, seasonNumber: 0 },
        { ...season, id: 20, seasonNumber: 1 },
      ],
      requestedSeason: null,
      selectedSeason: 1,
    },
    {
      name: 'Season 1 when Specials are absent',
      seasons: [
        { ...season, id: 50, seasonNumber: 5 },
        { ...season, id: 20, seasonNumber: 1 },
      ],
      requestedSeason: null,
      selectedSeason: 1,
    },
    {
      name: 'the lowest regular season when Season 1 is absent',
      seasons: [
        { ...season, id: 50, seasonNumber: 5 },
        { ...season, id: 10, seasonNumber: 0 },
        { ...season, id: 20, seasonNumber: 2 },
      ],
      requestedSeason: null,
      selectedSeason: 2,
    },
    {
      name: 'Specials when no regular seasons exist',
      seasons: [{ ...season, seasonNumber: 0 }],
      requestedSeason: null,
      selectedSeason: 0,
    },
    {
      name: 'an explicitly requested available season',
      seasons: [
        { ...season, seasonNumber: 0 },
        { ...season, id: 20, seasonNumber: 1 },
        { ...season, id: 50, seasonNumber: 5 },
      ],
      requestedSeason: '0',
      selectedSeason: 0,
    },
  ])(
    'selects $name by season number',
    async ({ seasons, requestedSeason, selectedSeason }) => {
      fetchMock.mockResolvedValue(Response.json({ ...series, seasons }));
      setup(`/series/1${requestedSeason ? `?season=${requestedSeason}` : ''}`);

      const selectedTab = await screen.findByRole('tab', {
        name:
          selectedSeason === 0
            ? 'Specials, Season 0'
            : `Season ${selectedSeason}`,
      });
      expect(selectedTab).toHaveAttribute('aria-selected', 'true');
      expect(
        screen.getByRole('link', { name: 'View season details' })
      ).toHaveAttribute('href', `/series/1/seasons/${selectedSeason}`);
    }
  );

  it('uses the selected regular season and does not retain episodes when navigating to another series', async () => {
    const firstSeries = {
      ...series,
      seasons: [
        { ...season, id: 20, seasonNumber: 1 },
        { ...season, seasonNumber: 0 },
      ],
    };
    const secondSeries = {
      ...series,
      id: 2,
      title: 'Another Journey',
      seasons: [
        { ...season, seriesId: 2, id: 60, seasonNumber: 3 },
        { ...season, seriesId: 2, id: 70, seasonNumber: 0 },
      ],
    };
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;

      if (path.includes('/seasons/')) {
        const pathParts = path.split('/');
        const seriesIdNumber = Number(pathParts[4]);
        const seasonNumber = Number(pathParts[6]);

        return Response.json({
          ...season,
          id: seriesIdNumber * 100 + seasonNumber,
          seriesId: seriesIdNumber,
          seasonNumber,
          episodeCount: 0,
          episodes: [],
        });
      }

      return Response.json(path.endsWith('/2') ? secondSeries : firstSeries);
    });
    const user = userEvent.setup();
    setup('/series/1');

    const firstSeasonTab = await screen.findByRole('tab', { name: 'Season 1' });
    expect(firstSeasonTab).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.findByText('No episodes available for this season yet.')
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Other series' }));

    const secondSeasonTab = await screen.findByRole('tab', {
      name: 'Season 3',
    });
    expect(secondSeasonTab).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.findByText('No episodes available for this season yet.')
    ).toBeVisible();
    expect(screen.queryByText('The Journey episode')).toBeNull();
  });

  it.each([
    { airDate: '2025-04-01', hasYear: true },
    { airDate: null, hasYear: false },
  ])(
    'shows available season year and episode count in one compact row',
    async ({ airDate, hasYear }) => {
      fetchMock.mockResolvedValue(
        Response.json({
          ...series,
          seasons: [{ ...season, airDate, episodeCount: 10 }],
        })
      );
      setup('/series/1');

      await screen.findByRole('link', { name: 'View season details' });

      const facts = document.querySelector('.season-preview__facts');
      expect(facts).toHaveTextContent(
        hasYear ? '2025·10 Episodes' : '10 Episodes'
      );
      const year = facts?.querySelector('.season-preview__year');

      if (hasYear) {
        expect(year).toHaveTextContent('2025');
      } else {
        expect(year).not.toBeInTheDocument();
      }
      expect(
        facts?.querySelector('.season-preview__episode-count')
      ).toHaveTextContent('10 Episodes');
      expect(facts).not.toHaveTextContent('Year');
    }
  );

  it.each(['network', 'http', 'invalid-response'] as const)(
    'keeps series details available when the Watch Providers client fails: %s',
    async (failure) => {
      vi.mocked(apiUtils.getWatchProviders).mockRestore();
      fetchMock.mockImplementation(async (input) => {
        if (String(input).endsWith('/watch-providers')) {
          if (failure === 'network') {
            throw new TypeError('private network details');
          }

          return failure === 'http'
            ? new Response('private server error', { status: 502 })
            : Response.json({ providers: [{ id: 'invalid' }] });
        }

        return Response.json(series);
      });

      try {
        await act(async () => {
          setup('/series/1');
        });

        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:4000/api/v1/series/1/watch-providers',
          { signal: expect.any(AbortSignal) }
        );
        expect(
          screen.getByRole('heading', { name: series.title })
        ).toBeVisible();
        expect(
          screen.queryByRole('heading', { name: 'Where to watch' })
        ).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByText(/private/)).toBeNull();
      } finally {
        vi.spyOn(apiUtils, 'getWatchProviders').mockResolvedValue({
          providers: [],
        });
      }
    }
  );

  it('renders accessible Cast and Crew tabs and keeps each preview mounted', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        credits: {
          cast: Array.from({ length: 40 }, (_, index) => ({
            id: 20 + index,
            name: `Actor ${index + 1}`,
            totalEpisodeCount: 8,
            characters: [
              {
                creditId: `role-${index}`,
                character: 'Guide',
                episodeCount: 8,
              },
            ],
          })),
          crew: [
            {
              id: 44,
              name: 'Writer Producer',
              departments: [
                { department: 'Writing', totalEpisodeCount: 8 },
                { department: 'Production', totalEpisodeCount: 8 },
              ],
              jobs: [
                {
                  creditId: 'writer',
                  job: 'Writer',
                  department: 'Writing',
                  episodeCount: 8,
                },
                {
                  creditId: 'producer',
                  job: 'Producer',
                  department: 'Production',
                  episodeCount: 8,
                },
              ],
            },
            ...Array.from({ length: 15 }, (_, index) => ({
              id: 100 + index,
              name: `Crew ${index + 1}`,
              departments: [
                { department: 'Directing', totalEpisodeCount: index + 1 },
              ],
              jobs: [
                {
                  creditId: `director-${index}`,
                  job: 'Director',
                  department: 'Directing',
                  episodeCount: index + 1,
                },
              ],
            })),
          ],
          sections: {
            cast: { status: 'available' },
            crew: { status: 'available' },
          },
        },
      })
    );

    setup('/series/1');
    const castTab = await screen.findByRole('tab', { name: 'Cast' });
    const crewTab = screen.getByRole('tab', { name: 'Crew' });
    expect(castTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Cast' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Actor 1' })).toBeVisible();
    expect(
      within(screen.getByRole('tabpanel', { name: 'Cast' })).getByRole('status')
    ).toHaveTextContent('Showing 16 of 40 cast members');
    expect(screen.getByRole('link', { name: 'Actor 16' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Actor 17' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Writer Producer' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show more cast' }));
    expect(
      within(screen.getByRole('tabpanel', { name: 'Cast' })).getByRole('status')
    ).toHaveTextContent('Showing 24 of 40 cast members');
    expect(screen.getByRole('link', { name: 'Actor 24' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Actor 25' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show more cast' }));
    expect(
      within(screen.getByRole('tabpanel', { name: 'Cast' })).getByRole('status')
    ).toHaveTextContent('Showing 32 of 40 cast members');
    expect(screen.getByRole('link', { name: 'Actor 32' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Actor 33' })).toBeNull();

    castTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(crewTab).toHaveFocus();
    expect(crewTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Crew' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Writer Producer' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Crew 15' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show more crew' }));
    expect(screen.getByRole('link', { name: 'Crew 15' })).toBeVisible();
    expect(
      within(screen.getByRole('tabpanel', { name: 'Crew' })).getAllByRole(
        'link',
        { name: 'Writer Producer' }
      )
    ).toHaveLength(2);
    expect(screen.getByText('Writer — 8 episodes')).toBeVisible();
    expect(screen.getByText('Producer — 8 episodes')).toBeVisible();

    crewTab.focus();
    await user.keyboard('{Home}');
    expect(castTab).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Actor 32' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Show less cast' })
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Show less cast' }));
    expect(
      within(screen.getByRole('tabpanel', { name: 'Cast' })).getByRole('status')
    ).toHaveTextContent('Showing 16 of 40 cast members');
    expect(screen.getByRole('link', { name: 'Actor 16' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Actor 17' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show less cast' })).toBeNull();

    castTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('link', { name: 'Crew 15' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows short Series Cast lists without progressive controls', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        credits: {
          cast: [
            {
              id: 31,
              name: 'Lead Actor',
              totalEpisodeCount: 4,
              characters: [
                { creditId: 'lead', character: 'Lead', episodeCount: 4 },
              ],
            },
            {
              id: 32,
              name: 'Guest Actor',
              totalEpisodeCount: 1,
              characters: [
                { creditId: 'guest', character: 'Guest', episodeCount: 1 },
              ],
            },
          ],
          crew: [],
          sections: {
            cast: { status: 'available' },
            crew: { status: 'available' },
          },
        },
      })
    );
    setup('/series/1');
    expect(
      await screen.findByText('Showing 2 of 2 cast members')
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show more cast' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show less cast' })).toBeNull();
  });

  it('reveals all remaining Series Cast members when fewer than eight remain', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        credits: {
          cast: Array.from({ length: 19 }, (_, index) => ({
            id: index + 1,
            name: `Actor ${index + 1}`,
            totalEpisodeCount: 1,
            characters: [
              {
                creditId: `role-${index}`,
                character: 'Guest',
                episodeCount: 1,
              },
            ],
          })),
          crew: [],
          sections: {
            cast: { status: 'available' },
            crew: { status: 'available' },
          },
        },
      })
    );
    setup('/series/1');
    await screen.findByText('Showing 16 of 19 cast members');
    await user.click(screen.getByRole('button', { name: 'Show more cast' }));
    expect(
      await screen.findByText('Showing 19 of 19 cast members')
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Actor 19' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show more cast' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Show less cast' })
    ).toBeVisible();
  });

  it.each([
    ['/series/1', 'The Journey'],
    ['/series/1/seasons/0', 'Special stories'],
    ['/series/1/seasons/0/episodes/3', 'Arrival'],
  ])(
    'uses the Movie page, hero and content framework at %s',
    async (path, title) => {
      const { container } = setup(path);
      const heading = await screen.findByRole('heading', {
        level: 1,
        name: title,
      });
      const detailSelector =
        path === '/series/1'
          ? '.movie-details__metadata dt'
          : '.series-detail__metadata';
      const expectedSelector = path.includes('/episodes/')
        ? '.series-detail__context'
        : detailSelector;

      expect(heading).toHaveClass('movie-details__title');
      expect(heading.closest('.movie-details__container')).not.toBeNull();
      expect(
        heading.closest('.detail-page__hero > .movie-details.container')
      ).not.toBeNull();
      expect(container.querySelector('header')).toBeNull();
      expect(container.querySelector(expectedSelector)).not.toBeNull();
      if (path !== '/series/1') {
        expect(container.querySelector('.personal-library-actions')).toBeNull();
      }
      expect(
        container
          .querySelector('.movie-details__lower-content .details-section')
          ?.closest('.container')
      ).toHaveClass('movie-details__lower-content');
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.queryByRole('contentinfo')).toBeNull();
    }
  );

  it('reveals crew in bounded increments and retains focus after the final reveal', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        credits: {
          cast: [],
          crew: Array.from({ length: 21 }, (_, index) => ({
            id: index + 100,
            name: `Crew ${index + 1}`,
            departments: [
              { department: 'Production', totalEpisodeCount: null },
            ],
            jobs: [
              {
                creditId: `job-${index}`,
                job: 'Producer',
                department: 'Production',
                episodeCount: null,
              },
            ],
          })),
          sections: {
            cast: { status: 'available' },
            crew: { status: 'available' },
          },
        },
      })
    );
    setup('/series/1');
    await userEvent.click(await screen.findByRole('tab', { name: 'Crew' }));
    const reveal = await screen.findByRole('button', {
      name: 'Show more crew',
    });
    expect(
      screen.queryByRole('link', { name: 'Crew 21' })
    ).not.toBeInTheDocument();
    await userEvent.click(reveal);
    expect(screen.getByRole('link', { name: 'Crew 21' })).toHaveAttribute(
      'href',
      '/person/120'
    );
    expect(
      screen.queryByRole('button', { name: 'Show more crew' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Showing 21 of 21 crew members')).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('renders aggregate characters/jobs and bounded galleries from one details request', async () => {
    const photos = Array.from({ length: 12 }, (_, i) => ({
      filePath: `/p${i}.jpg`,
      thumbnailUrl: `https://images.test/w500/p${i}.jpg`,
      fullUrl: `https://images.test/original/p${i}.jpg`,
    }));
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        credits: {
          cast: [
            {
              id: 11,
              name: 'Series Actor',
              totalEpisodeCount: 5,
              characters: [
                { creditId: 'a', character: 'Guide', episodeCount: 4 },
                { creditId: 'b', character: 'Visitor', episodeCount: 2 },
              ],
            },
            {
              id: 13,
              name: 'Single Character Actor',
              totalEpisodeCount: 5,
              characters: [
                { creditId: 'c', character: 'Lead', episodeCount: 5 },
              ],
            },
            {
              id: 14,
              name: 'Zero Episode Actor',
              totalEpisodeCount: 0,
              characters: [
                { creditId: 'd', character: 'Zero', episodeCount: 0 },
              ],
            },
            {
              id: 15,
              name: 'Missing Character Count Actor',
              totalEpisodeCount: 4,
              characters: [
                { creditId: 'e', character: 'Unknown', episodeCount: null },
              ],
            },
            {
              id: 16,
              name: 'Different Total Actor',
              totalEpisodeCount: 6,
              characters: [
                { creditId: 'f', character: 'Other', episodeCount: 5 },
              ],
            },
          ],
          crew: [
            {
              id: 12,
              name: 'Series Producer',
              departments: [{ department: 'Production', totalEpisodeCount: 5 }],
              jobs: [
                {
                  creditId: 'p',
                  job: 'Executive Producer',
                  department: 'Production',
                  episodeCount: 5,
                },
              ],
            },
          ],
          sections: {
            cast: { status: 'available' },
            crew: { status: 'available' },
          },
        },
        images: {
          posters: photos,
          backdrops: [],
          sections: {
            posters: { status: 'available' },
            backdrops: { status: 'available' },
          },
        },
        videos: { videos: [], availability: { status: 'available' } },
      })
    );
    setup('/series/1');
    await userEvent.click(await screen.findByRole('tab', { name: 'Posters' }));
    expect(
      await screen.findByRole('link', { name: 'Series Actor' })
    ).toHaveAttribute('href', '/person/11');
    expect(screen.getByText(/Guide.*4 episodes/)).toHaveTextContent(
      /Visitor.*2 episodes/
    );
    expect(
      screen.getByText(
        'Guide · 4 episodes · Visitor · 2 episodes · Total: 5 episodes'
      )
    ).toBeVisible();
    expect(screen.getByText('Lead · 5 episodes')).toBeVisible();
    expect(screen.queryByText(/Lead.*Total/)).toBeNull();
    expect(screen.getByText('Zero · 0 episodes')).toBeVisible();
    expect(screen.getByText('Unknown · Total: 4 episodes')).toBeVisible();
    expect(
      screen.getByText('Other · 5 episodes · Total: 6 episodes')
    ).toBeVisible();
    expect(
      screen.getByText(/Executive Producer.*5 episodes/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /View The Journey poster/ })
    ).toHaveLength(10);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await userEvent.click(
      screen.getByRole('button', { name: 'View The Journey poster 1' })
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/1.*12/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(
      screen.getByRole('button', { name: 'View The Journey poster 1' })
    ).toHaveFocus();
    await userEvent.click(screen.getByRole('link', { name: 'Series Actor' }));
    expect(
      await screen.findByRole('heading', { name: 'Person profile' })
    ).toBeInTheDocument();
  });

  it('keeps metadata visible and recovers only a failed optional section', async () => {
    setup('/series/1');
    expect(
      await screen.findByRole('heading', { name: 'The Journey' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValueOnce(
      Response.json({ videos: [], availability: { status: 'available' } })
    );
    await userEvent.click(
      screen.getByRole('tab', { name: 'Videos & Trailers' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry videos' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Retry videos' })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: 'Videos & Trailers' })
    ).not.toBeInTheDocument();
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      '/api/v1/series/1/videos'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      screen.getByRole('button', { name: 'Retry images' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'The Journey' })
    ).toBeInTheDocument();
  });

  it('updates the hero and Media poster galleries from one recovered Images response', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ ...series, posterUrl: '/hero.jpg' })
    );
    setup('/series/1');
    await screen.findByRole('heading', { name: 'The Journey' });
    fireEvent.load(screen.getByRole('img', { name: 'Poster for The Journey' }));
    fetchMock.mockResolvedValueOnce(
      Response.json({
        posters: [
          { thumbnailUrl: '/recovered-thumb.jpg', fullUrl: '/recovered.jpg' },
        ],
        backdrops: [],
        sections: {
          posters: { status: 'available' },
          backdrops: { status: 'available' },
        },
      })
    );

    await userEvent.click(screen.getByRole('button', { name: 'Retry images' }));
    await userEvent.click(await screen.findByRole('tab', { name: 'Posters' }));

    expect(
      await screen.findByRole('button', { name: 'View The Journey poster 1' })
    ).toBeInTheDocument();
    const heroGallery = screen.getByRole('button', {
      name: 'Open poster gallery for The Journey',
    });
    await userEvent.click(heroGallery);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/recovered.jpg'
    );
    await userEvent.keyboard('{Escape}');
    expect(heroGallery).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      '/api/v1/series/1/images'
    );
  });

  it('keeps recovery status and focus after Images recovery returns empty collections', async () => {
    setup('/series/1');
    await screen.findByRole('heading', { name: 'The Journey' });
    fetchMock.mockResolvedValueOnce(
      Response.json({
        posters: [],
        backdrops: [],
        sections: {
          posters: { status: 'available' },
          backdrops: { status: 'available' },
        },
      })
    );
    const retry = screen.getByRole('button', { name: 'Retry images' });

    await userEvent.click(retry);

    const status = await screen.findByText('Images loaded.');
    expect(status).toHaveTextContent('Images loaded.');
    expect(status.parentElement).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Backdrops' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Posters' })).toBeInTheDocument();
    expect(screen.queryByText('0 posters available')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('aborts section recovery on navigation and ignores an obsolete result', async () => {
    setup('/series/1');
    await screen.findByRole('heading', { name: 'The Journey' });
    let complete: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry images' }));
    const signal = fetchMock.mock.calls[1][1]?.signal;
    await userEvent.click(screen.getByRole('link', { name: 'Other series' }));
    expect(signal?.aborted).toBe(true);
    await act(async () =>
      complete?.(
        Response.json({
          posters: [],
          backdrops: [],
          sections: {
            posters: { status: 'available' },
            backdrops: { status: 'available' },
          },
        })
      )
    );
    expect(screen.queryByText('Images loaded.')).not.toBeInTheDocument();
  });

  it('uses canonical API paths for each Series resource', async () => {
    await getSeries(1);
    await getSeason(1, 0);
    await getEpisode(1, 0, 3);
    await getEpisodeCredits(1, 0, 3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'http://localhost:4000/api/v1/series/1',
      'http://localhost:4000/api/v1/series/1/seasons/0',
      'http://localhost:4000/api/v1/series/1/seasons/0/episodes/3',
      'http://localhost:4000/api/v1/series/1/seasons/0/episodes/3/credits',
    ]);
  });

  it.each([
    { ...series, id: 2 },
    { ...series, voteCount: -1 },
    { ...series, originCountries: ['USA'] },
    { ...series, creators: [null] },
    { ...series, seasons: [{ ...season }, { ...season }] },
    { ...series, firstAirDate: '2026-02-30' },
  ])('rejects malformed series contracts %#', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(getSeries(1)).rejects.toEqual(
      new ApiRequestError('invalid-response')
    );
  });

  it.each([
    { ...season, episodes: null },
    { ...season, episodeCount: 10 },
    { ...season, seasonNumber: 1 },
    { ...season, episodes: [{ ...episode, seriesId: 2 }], episodeCount: 1 },
    { ...season, episodes: [episode, episode], episodeCount: 2 },
  ])('rejects malformed season contracts %#', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(getSeason(1, 0)).rejects.toMatchObject({
      category: 'invalid-response',
    });
  });

  it.each([
    { ...episode, episodeNumber: 4 },
    { ...episode, runtimeMinutes: 0 },
    { ...episode, credits: { ...credits, sections: {} } },
    {
      ...episode,
      credits: { ...credits, cast: [{ name: 'Bad', characters: null }] },
    },
  ])('rejects malformed episode contracts %#', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(getEpisode(1, 0, 3)).rejects.toMatchObject({
      category: 'invalid-response',
    });
  });

  it('selects many seasons locally with keyboard navigation and keeps Specials reachable', async () => {
    const user = userEvent.setup();
    const manySeasons = Array.from({ length: 25 }, (_, index) => ({
      ...season,
      id: 100 + index,
      seasonNumber: index + 1,
      title: `Book ${index + 1}`,
    }));
    fetchMock.mockResolvedValue(
      Response.json({ ...series, seasons: [...manySeasons, season] })
    );
    const originalClientWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    );
    const originalScrollWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return this.classList.contains('season-tabs') ? 400 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return this.classList.contains('season-tabs') ? 1800 : 0;
      },
    });
    setup('/series/1');
    const first = await screen.findByRole('tab', { name: 'Season 1' });
    const seasonTabs = within(screen.getByRole('tablist', { name: 'Seasons' }));
    expect(first).toHaveTextContent('1');
    expect(seasonTabs.getAllByRole('tab')).toHaveLength(26);
    expect(first).toHaveAttribute('aria-selected', 'true');
    first.focus();
    await user.keyboard('{End}');
    const specials = seasonTabs.getByRole('tab', {
      name: 'Specials, Season 0',
    });
    expect(specials).toHaveTextContent('Specials');
    expect(specials).toHaveFocus();
    expect(specials).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tabpanel', { name: 'Specials, Season 0' })
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View season details' })
    ).toHaveAttribute('href', '/series/1/seasons/0');
    await user.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();
    expect(
      screen.getByRole('link', { name: 'View season details' })
    ).toHaveAttribute('href', '/series/1/seasons/1');
    await user.click(screen.getByRole('button', { name: 'Next season' }));
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    if (originalClientWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        originalClientWidth
      );
    } else {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }
    if (originalScrollWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollWidth',
        originalScrollWidth
      );
    } else {
      delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    }
  });

  it('shows season arrows from measured overflow and updates them after resize and scrolling', async () => {
    const manySeasons = Array.from({ length: 15 }, (_, index) => ({
      ...season,
      id: 200 + index,
      seasonNumber: index + 1,
      title: `Season ${index + 1}`,
    }));
    const observers: {
      callback: ResizeObserverCallback;
      observed: Set<Element>;
    }[] = [];
    const disconnect = vi.fn();
    class ResizeObserverMock {
      private readonly observed = new Set<Element>();

      constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, observed: this.observed });
      }

      observe(element: Element) {
        this.observed.add(element);
      }

      disconnect() {
        disconnect();
        this.observed.clear();
      }

      unobserve(element: Element) {
        this.observed.delete(element);
      }
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return this.classList.contains('season-tabs') ? 400 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        if (!this.classList.contains('season-tabs')) {
          return 0;
        }

        return (this as HTMLElement).dataset.overflow === 'yes' ? 1200 : 400;
      },
    });
    fetchMock.mockResolvedValue(
      Response.json({ ...series, seasons: manySeasons })
    );
    const addEventListener = vi.spyOn(
      HTMLElement.prototype,
      'addEventListener'
    );
    const view = setup('/series/1');
    const first = await screen.findByRole('tab', { name: 'Season 1' });
    // The tabs can commit before the passive effect registers the observer.
    const list = screen.getByRole('tablist', { name: 'Seasons' });
    await waitFor(() =>
      expect(observers.some(({ observed }) => observed.has(list))).toBe(true)
    );
    expect(screen.queryByRole('button', { name: 'Next season' })).toBeNull();
    list.setAttribute('data-overflow', 'yes');
    const seasonObserver = observers.find(({ observed }) => observed.has(list));
    act(() => seasonObserver?.callback([], {} as ResizeObserver));
    const next = screen.getByRole('button', { name: 'Next season' });
    const previous = screen.getByRole('button', { name: 'Previous season' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(
      addEventListener.mock.calls.filter(
        ([type], index) =>
          type === 'scroll' && addEventListener.mock.contexts[index] === list
      )
    ).toHaveLength(1);
    await userEvent.click(next);
    expect(first).toHaveAttribute('aria-selected', 'true');
    (list as HTMLDivElement).scrollLeft = 400;
    fireEvent.scroll(list);
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();
    (list as HTMLDivElement).scrollLeft = 800;
    fireEvent.scroll(list);
    expect(next).toBeDisabled();
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(observers.length);
    addEventListener.mockRestore();
  });

  it('opens the season selector accessibly and navigates without duplicate requests', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;

      return Response.json(
        path.includes('/seasons/')
          ? {
              ...season,
              seasonNumber: Number(path.split('/').at(-1)),
              title:
                Number(path.split('/').at(-1)) === 5
                  ? 'Book Five'
                  : season.title,
              episodes: [],
              episodeCount: 0,
            }
          : series
      );
    });
    setup('/series/1/seasons/0', true);
    const selector = await screen.findByRole('button', {
      name: 'Specials: Special stories',
    });

    expect(selector).toHaveAttribute('aria-expanded', 'false');
    await user.click(selector);
    expect(selector).toHaveAttribute('aria-expanded', 'true');
    expect(
      document.querySelector(
        '.series-season-selector__options [aria-current="page"]'
      )
    ).toHaveTextContent('Specials: Special stories');

    await user.keyboard('{Escape}');
    expect(selector).toHaveAttribute('aria-expanded', 'false');
    expect(selector).toHaveFocus();

    await user.click(selector);
    fireEvent.pointerDown(document.body);
    expect(selector).toHaveAttribute('aria-expanded', 'false');

    await user.click(selector);
    await user.tab();
    expect(
      screen.getByRole('link', { name: 'Season 5: Book Five' })
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Book Five' })
    ).toBeVisible();
    expect(screen.getByTestId('current-route')).toHaveTextContent(
      '/series/1/seasons/5'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await user.click(screen.getByRole('button', { name: 'History back' }));
    await waitFor(() =>
      expect(screen.getByTestId('current-route')).toHaveTextContent(
        '/series/1/seasons/0'
      )
    );
    await user.click(screen.getByRole('button', { name: 'History forward' }));
    await waitFor(() =>
      expect(screen.getByTestId('current-route')).toHaveTextContent(
        '/series/1/seasons/5'
      )
    );
  });

  it('presents Retry-After guidance through the shared error state', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '12' } })
    );
    setup('/series/1');
    expect(
      await screen.findByRole('heading', { name: 'Please try again shortly' })
    ).toBeInTheDocument();
    expect(screen.getByText(/wait about 12 seconds/)).toBeInTheDocument();
  });
  it('wraps a long series title and omits genres when none are available', async () => {
    const title = 'A Very Long Series Title That Needs To Wrap Across Lines';
    fetchMock.mockResolvedValue(
      Response.json({ ...series, title, genres: [' ', ''] })
    );

    setup('/series/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: title })
    ).toBeInTheDocument();
    expect(document.querySelector('.movie-details__genre')).toBeNull();
  });

  it('renders the complete Series overview without truncation controls', async () => {
    const description = 'A complete series overview that stays intact. '.repeat(
      12
    );
    fetchMock.mockResolvedValue(Response.json({ ...series, description }));

    setup('/series/1');

    await screen.findByRole('heading', { level: 1, name: series.title });
    expect(
      document.querySelector('.movie-details__overview')?.textContent
    ).toBe(description);
    expect(
      screen.queryByRole('button', { name: /^(Show more|Show less)$/i })
    ).toBeNull();
  });

  it.each(['', '   '])(
    'preserves empty Series overview text (%j)',
    async (description) => {
      fetchMock.mockResolvedValue(Response.json({ ...series, description }));

      setup('/series/1');

      await screen.findByRole('heading', { level: 1, name: series.title });
      expect(
        document.querySelector('.movie-details__overview')?.textContent
      ).toBe(description);
    }
  );

  it('shows the selected season overview above its full-width episode rows', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/seasons/')
        ? Response.json({ ...season, description: 'A season overview.' })
        : Response.json(series)
    );
    setup('/series/1?season=0');

    const firstEpisode = await screen.findByRole('link', {
      name: '1. Beginning',
    });
    const overview = screen.getByText('A season overview.');
    const episodesHeading = screen.getByRole('heading', { name: 'Episodes' });
    expect(overview.compareDocumentPosition(episodesHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(firstEpisode).toHaveAttribute(
      'href',
      '/series/1/seasons/0/episodes/1'
    );
    expect(
      fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes('/seasons/'))
    ).toEqual(['http://localhost:4000/api/v1/series/1/seasons/0']);
  });

  it('shows the Season title with compact year and episode-count facts', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/seasons/')
        ? Response.json({
            ...season,
            seasonNumber: 1,
            title: 'Season 1',
            airDate: '2021-04-01',
            episodeCount: 8,
            episodes: Array.from({ length: 8 }, (_, index) => ({
              ...season.episodes[index % season.episodes.length],
              id: 100 + index,
              episodeNumber: index + 1,
              seasonNumber: 1,
            })),
          })
        : Response.json(series)
    );
    setup('/series/1/seasons/1');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Season 1' })
    ).toBeVisible();
    const facts = screen.getByLabelText('Season information');

    expect(within(facts).getByText('2021')).toBeVisible();
    expect(within(facts).getByText('8 Episodes')).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const title = screen.getByRole('heading', { level: 1, name: 'Season 1' });
    expect(title.compareDocumentPosition(breadcrumb)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(
      within(breadcrumb).getByRole('link', { name: 'The Journey' })
    ).toHaveAttribute('href', '/series/1');
    expect(within(breadcrumb).getByText('Season 1')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(facts.parentElement).toBe(breadcrumb.parentElement);
  });

  it('renders every selected-season episode without an episode Show more button', async () => {
    const episodes = Array.from({ length: 10 }, (_, index) => ({
      ...episode,
      id: index + 1,
      episodeNumber: index + 1,
      title: `Episode ${index + 1}`,
    }));
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/seasons/')
        ? Response.json({ ...season, episodeCount: episodes.length, episodes })
        : Response.json(series)
    );
    setup('/series/1?season=0');

    expect(
      await screen.findByRole('link', { name: '10. Episode 10' })
    ).toHaveAttribute('href', '/series/1/seasons/0/episodes/10');
    expect(
      screen.getAllByRole('link', { name: /^\d+\. Episode \d+$/ })
    ).toHaveLength(10);
    expect(screen.queryByRole('button', { name: /^Show more$/ })).toBeNull();
  });

  it('updates the complete episode list when switching seasons', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;

      if (path.includes('/seasons/')) {
        const seasonNumber = Number(path.split('/').at(-1));

        return Response.json(
          seasonNumber === 0
            ? {
                ...season,
                episodeCount: 10,
                episodes: Array.from({ length: 10 }, (_, index) => ({
                  ...episode,
                  id: index + 1,
                  episodeNumber: index + 1,
                  title: `Special ${index + 1}`,
                })),
              }
            : {
                ...season,
                seasonNumber,
                episodeCount: 2,
                episodes: [
                  {
                    ...episode,
                    id: 51,
                    seasonNumber,
                    episodeNumber: 1,
                    title: 'Book Five 1',
                  },
                  {
                    ...episode,
                    id: 52,
                    seasonNumber,
                    episodeNumber: 2,
                    title: 'Book Five 2',
                  },
                ],
              }
        );
      }

      return Response.json(series);
    });
    setup('/series/1?season=0');

    expect(
      await screen.findByRole('link', { name: '10. Special 10' })
    ).toBeVisible();
    await userEvent.click(screen.getByRole('tab', { name: 'Season 5' }));

    expect(
      await screen.findByRole('link', { name: '2. Book Five 2' })
    ).toHaveAttribute('href', '/series/1/seasons/5/episodes/2');
    expect(screen.queryByRole('link', { name: '1. Special 1' })).toBeNull();
    expect(
      screen.getAllByRole('link', { name: /^\d+\. Book Five \d+$/ })
    ).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Show more$/ })).toBeNull();
  });

  it('ignores a stale season response after rapidly switching season tabs', async () => {
    const pendingSeasons = new Map<number, (response: Response) => void>();
    let firstSeasonSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((input, init) => {
      const path = new URL(String(input)).pathname;

      if (path.includes('/seasons/')) {
        const seasonNumber = Number(path.split('/').at(-1));

        if (seasonNumber === 5) {
          firstSeasonSignal = init?.signal ?? undefined;
        }

        return new Promise<Response>((resolve) => {
          pendingSeasons.set(seasonNumber, resolve);
        });
      }

      return Promise.resolve(Response.json(series));
    });
    setup('/series/1');

    expect(await screen.findByText('Loading episodes…')).toBeVisible();
    await waitFor(() => expect(pendingSeasons.has(5)).toBe(true));
    await userEvent.click(
      screen.getByRole('tab', { name: 'Specials, Season 0' })
    );
    await waitFor(() => expect(pendingSeasons.has(0)).toBe(true));

    await act(async () =>
      pendingSeasons.get(0)?.(
        Response.json({
          ...season,
          episodeCount: 1,
          episodes: [
            {
              ...episode,
              id: 1,
              episodeNumber: 1,
              title: 'Current season episode',
            },
          ],
        })
      )
    );
    expect(
      await screen.findByRole('link', { name: '1. Current season episode' })
    ).toBeVisible();

    await act(async () =>
      pendingSeasons.get(5)?.(
        Response.json({
          ...season,
          seasonNumber: 5,
          episodeCount: 1,
          episodes: [
            {
              ...episode,
              id: 51,
              seasonNumber: 5,
              episodeNumber: 1,
              title: 'Stale episode',
            },
          ],
        })
      )
    );
    expect(firstSeasonSignal?.aborted).toBe(true);
    expect(screen.queryByRole('link', { name: '1. Stale episode' })).toBeNull();
  });

  it('shows selected-season empty and error states', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;

      if (path.includes('/seasons/')) {
        return Response.json({ ...season, episodeCount: 0, episodes: [] });
      }

      return Response.json(series);
    });
    const view = setup('/series/1?season=0');
    expect(
      await screen.findByText('No episodes available for this season yet.')
    ).toBeVisible();

    view.unmount();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/seasons/')
        ? new Response('', { status: 500 })
        : Response.json(series)
    );
    setup('/series/1?season=0');
    expect(await screen.findByText(/Episodes unavailable\./)).toBeVisible();
  });

  it('loads only the selected season while rendering named seasons and Specials', async () => {
    vi.mocked(apiUtils.getWatchProviders).mockResolvedValueOnce({
      providers: [
        {
          id: 8,
          name: 'Netflix',
          category: 'streaming',
          region: 'US',
        },
      ],
    });
    useLibraryStore.getState().add(
      {
        mediaType: 'tv',
        id: series.id,
        title: 'Old series name',
        posterUrl: '/old-poster.jpg',
        firstAirDate: '2010-01-01',
      },
      'favorites'
    );
    setup('/series/1?season=0');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Journey' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Original Journey').closest('.series-information')
    ).not.toBeNull();
    expect(screen.getByText('No overview available.')).toBeInTheDocument();
    const seriesTitle = screen.getByRole('heading', {
      level: 1,
      name: 'The Journey',
    });
    const firstAired = screen.getByText('2025');
    const actions = screen.getByRole('button', {
      name: 'Add to Watchlist The Journey',
    });
    expect(actions.closest('.personal-library-actions')).toHaveClass(
      'personal-library-actions--expanded'
    );
    const overview = screen.getByRole('heading', { name: 'Overview' });
    const information = screen.getByRole('heading', {
      name: 'Series Information',
    });
    const providers = screen.getByRole('heading', { name: /Where to watch/i });
    expect(seriesTitle.compareDocumentPosition(actions)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(firstAired.parentElement).toHaveClass('movie-details__data');
    expect(screen.getByText('2 seasons')).toBeInTheDocument();
    expect(screen.getByText('12 episodes')).toBeInTheDocument();
    expect(firstAired.compareDocumentPosition(actions)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(firstAired.compareDocumentPosition(overview)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(actions.compareDocumentPosition(overview)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(overview.compareDocumentPosition(information)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(information.compareDocumentPosition(providers)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(
      screen.getByText('Returning Series').closest('.series-information')
    ).not.toBeNull();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove from Favorites The Journey' })
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(useLibraryStore.getState().items['tv:1']).toMatchObject({
        title: 'The Journey',
        year: 2025,
        collections: { favorites: true },
      })
    );
    expect(
      screen.getByLabelText('TMDB rating: 8.5 out of 10 from 200 votes')
    ).toBeInTheDocument();
    expect(screen.queryByText('200 votes')).toBeNull();
    expect(document.querySelector('.series-rating')).toBeNull();
    expect(screen.getByRole('link', { name: 'Creator' })).toHaveAttribute(
      'href',
      '/person/7'
    );
    expect(
      screen.getByRole('link', { name: 'View season details' })
    ).toHaveAttribute('href', '/series/1/seasons/0');
    await userEvent.click(screen.getByRole('tab', { name: 'Season 5' }));
    expect(screen.getByRole('heading', { name: 'Season 5' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View season details' })
    ).toHaveAttribute('href', '/series/1/seasons/5');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(document.title).toBe('The Journey | Movie Explorer');
  });

  it('keeps zero counts highlighted and Last aired in Series Information', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        originalTitle: series.title,
        seasonCount: 0,
        episodeCount: 0,
        lastAirDate: '2026-02-03',
      })
    );

    setup('/series/1');

    await screen.findByRole('heading', { level: 1, name: series.title });
    const seasons = screen.getByText('0 seasons');
    const episodes = screen.getByText('0 episodes');
    const informationSection = screen
      .getByRole('heading', { name: 'Series Information' })
      .closest('.series-information');

    expect(seasons.parentElement).toHaveClass('movie-details__data');
    expect(episodes.parentElement).toBe(seasons.parentElement);
    expect(screen.getAllByText('0 seasons')).toHaveLength(1);
    expect(screen.getAllByText('0 episodes')).toHaveLength(1);
    expect(informationSection).toHaveTextContent('2026-02-03');
    expect(informationSection).toHaveTextContent('Returning Series');
    expect(informationSection).not.toHaveTextContent('0 seasons');
    expect(informationSection).not.toHaveTextContent('0 episodes');
    expect(
      screen.queryByText(series.title, { selector: '.series-original-title' })
    ).toBeNull();
  });

  it('navigates series → Specials → episode and uses actual sparse neighbors with no redundant season fetch', async () => {
    const user = userEvent.setup();
    setup('/series/1');
    await user.click(
      await screen.findByRole('tab', { name: 'Specials, Season 0' })
    );
    await user.click(
      await screen.findByRole('link', { name: 'View season details' })
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Special stories' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Specials: Special stories' })
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(screen.getByText('No season overview available.')).toBeVisible();
    await user.click(screen.getByRole('link', { name: '3. Arrival' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arrival' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Journey' })).toHaveAttribute(
      'href',
      '/series/1'
    );
    expect(document.querySelector('.details-ratings')).toBeNull();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const episodeTitle = screen.getByRole('heading', {
      level: 1,
      name: 'Arrival',
    });
    const episodeDetails = screen.getByLabelText('Episode details');
    const overview = screen.getByRole('heading', { name: 'Overview' });

    expect(episodeTitle.compareDocumentPosition(breadcrumb)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(breadcrumb.compareDocumentPosition(overview)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(episodeDetails).toHaveTextContent('2026-01-02 · 24 min');

    expect(
      within(breadcrumb).getByRole('link', { name: 'Specials' })
    ).toHaveAttribute('href', '/series/1/seasons/0');
    expect(within(breadcrumb).getByText('Episode 3')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'Previous: 1. Beginning' })
    ).toHaveAttribute('href', '/series/1/seasons/0/episodes/1');
    expect(
      screen.getByRole('link', { name: 'Next: 8. Departure' })
    ).toHaveAttribute('href', '/series/1/seasons/0/episodes/8');
    expect(screen.getByRole('link', { name: 'Guest Actor' })).toHaveAttribute(
      'href',
      '/person/12'
    );
    expect(screen.getByText('Showing 1 of 1 guest stars')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Guest stars' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Writing' })).toBeVisible();
    expect(screen.getByText(/Writer, Story/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await user.click(screen.getByRole('link', { name: 'Next: 8. Departure' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Departure' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /^Next:/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Previous: 3. Arrival' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('loads direct Episode URLs with their Series breadcrumb and season context', async () => {
    setup('/series/1/seasons/0/episodes/3');
    expect(
      await screen.findByRole('heading', { name: 'Arrival', level: 1 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Next: 8. Departure' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Episode details')).toHaveTextContent(
      '2026-01-02 · 24 min'
    );
    expect(screen.queryByText('0 votes')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^TMDB rating:/)).not.toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('link', { name: 'The Journey' })).toHaveAttribute(
      'href',
      '/series/1'
    );
  });

  it('keeps episode details when optional season context fails and supports retry', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/episodes/')
        ? Response.json(episode)
        : new Response('', { status: 502 })
    );
    setup('/series/1/seasons/0/episodes/3');
    expect(
      await screen.findByRole('heading', { name: 'Arrival', level: 1 })
    ).toBeInTheDocument();
    const retry = await screen.findByRole('button', {
      name: 'Retry season context',
    });
    fetchMock.mockResolvedValueOnce(Response.json(season));
    fireEvent.click(retry);
    expect(
      await screen.findByRole('link', { name: 'Next: 8. Departure' })
    ).toBeInTheDocument();
  });

  it('keeps season episodes when parent context fails', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/seasons/')
        ? Response.json(season)
        : new Response('', { status: 404 })
    );
    setup('/series/1/seasons/0');
    expect(
      await screen.findByRole('link', { name: '3. Arrival' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Retry series context' })
    ).toBeInTheDocument();
  });

  it('shows missing episode metadata safely', async () => {
    fetchMock.mockImplementation(async (input) =>
      Response.json(
        String(input).includes('/episodes/')
          ? {
              ...episode,
              description: null,
              airDate: null,
              runtimeMinutes: null,
              rating: null,
              voteCount: null,
              credits: { ...credits, cast: [], guestStars: [], crew: [] },
            }
          : season
      )
    );
    setup('/series/1/seasons/0/episodes/3');
    expect(
      await screen.findByText('No episode overview available.')
    ).toBeInTheDocument();
    expect(screen.getByText('No cast listed.')).toBeInTheDocument();
    expect(screen.queryByText('Runtime')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/TMDB rating/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Still from Arrival' })
    ).toBeInTheDocument();
  });

  it('renders an empty upcoming season', async () => {
    fetchMock.mockImplementation(async (input) =>
      Response.json(
        String(input).includes('/seasons/')
          ? { ...season, episodes: [], episodeCount: 0 }
          : series
      )
    );
    setup('/series/1/seasons/0');
    expect(
      await screen.findByText('No episodes available for this season yet.')
    ).toBeInTheDocument();
  });

  it('recovers unavailable credits without discarding usable base guests or crew', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith('/credits')) {
        return Response.json({
          ...credits,
          guestStars: [],
          crew: [],
          sections: {
            cast: { status: 'available' },
            guestStars: { status: 'unavailable' },
            crew: { status: 'unavailable' },
          },
        });
      }

      return Response.json(
        String(input).includes('/episodes/')
          ? {
              ...episode,
              credits: {
                ...credits,
                cast: [],
                sections: {
                  ...credits.sections,
                  cast: { status: 'unavailable' },
                },
              },
            }
          : season
      );
    });
    setup('/series/1/seasons/0/episodes/3');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry episode credits' })
    );
    expect(
      await screen.findByRole('link', { name: 'Regular Actor' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Guest Actor' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Episode Writer' })
    ).toBeInTheDocument();
  });

  it.each([
    '/series/0',
    '/series/1/seasons/-1',
    '/series/1/seasons/0/episodes/0',
    '/series/1/seasons/-1/episodes/1',
  ])('rejects invalid coordinates at %s without requests', async (path) => {
    setup(path);
    expect(
      await screen.findByText(/Invalid .* coordinates/)
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('shows loading then a missing-resource response', async () => {
    let resolve: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    setup('/series/1');
    expect(screen.getByLabelText('Loading Series')).toHaveAttribute(
      'aria-busy',
      'true'
    );
    await act(async () => resolve(new Response('', { status: 404 })));
    expect(await screen.findByText('Series not found')).toBeInTheDocument();
  });

  it('supports provider error recovery', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }));
    setup('/series/1');
    const retry = await screen.findByRole('button', { name: /try again/i });
    fireEvent.click(retry);
    expect(
      await screen.findByRole('heading', { name: 'The Journey', level: 1 })
    ).toBeInTheDocument();
  });

  it('cancels obsolete series work and ignores its late response', async () => {
    let resolve: (response: Response) => void = () => undefined;
    let signal: AbortSignal | null | undefined;
    fetchMock.mockImplementationOnce((_url, init) => {
      signal = init?.signal;

      return new Promise((done) => {
        resolve = done;
      });
    });
    setup('/series/1');
    fetchMock.mockResolvedValue(
      Response.json({ ...series, id: 2, title: 'Second series' })
    );
    fireEvent.click(screen.getByRole('link', { name: 'Other series' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Second series' })
    ).toBeInTheDocument();
    await act(async () => resolve(Response.json(series)));
    expect(signal?.aborted).toBe(true);
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { level: 1, name: 'The Journey' })
      ).not.toBeInTheDocument()
    );
  });

  it('resets episode content and ignores stale results on rapid navigation', async () => {
    let resolve: (response: Response) => void = () => undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    setup('/series/1/seasons/0/episodes/3');
    fireEvent.click(screen.getByRole('link', { name: 'Other episode' }));
    expect(
      await screen.findByRole('heading', { name: 'Departure', level: 1 })
    ).toBeInTheDocument();
    await act(async () => resolve(Response.json(episode)));
    expect(
      screen.queryByRole('heading', { name: 'Arrival', level: 1 })
    ).not.toBeInTheDocument();
  });
});

describe('Season and Episode shared hero images', () => {
  it.each(['season', 'episode'] as const)(
    'opens the original %s image only in the shared lightbox and restores focus',
    async (kind) => {
      const image = 'https://images.test/w300/hero.jpg';
      const original = 'https://images.test/original/hero.jpg';
      const srcSet = `${image} 1x, ${original} 3x`;
      fetchMock.mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes('/episodes/')) {
          return Response.json({
            ...episode,
            stillUrl: image,
            stillSrcSet: srcSet,
          });
        }
        if (url.includes('/seasons/')) {
          return Response.json({
            ...season,
            posterUrl: image,
            posterSrcSet: srcSet,
          });
        }

        return Response.json({
          ...series,
          backdropUrl: 'https://images.test/w500/backdrop.jpg',
        });
      });
      setup(
        kind === 'season'
          ? '/series/1/seasons/0'
          : '/series/1/seasons/0/episodes/3'
      );
      const title = kind === 'season' ? season.title : episode.title;
      const action = await screen.findByRole('button', {
        name: `${kind === 'season' ? 'Poster for' : 'Still from'} ${title}`,
      });
      expect(action).toBeDisabled();
      const thumbnail = action.querySelector('img');
      expect(thumbnail).not.toBeNull();
      expect(thumbnail).not.toHaveAttribute('src', original);
      expect(thumbnail?.getAttribute('srcset')).not.toContain('/original/');
      expect(screen.queryByRole('dialog')).toBeNull();
      if (thumbnail) {
        fireEvent.load(thumbnail);
      }
      await userEvent.click(action);
      const dialog = screen.getByRole('dialog', {
        name: `${title} photo viewer`,
      });
      expect(dialog.querySelector('img')).toHaveAttribute('src', original);
      expect(dialog).toHaveTextContent('1 / 1');
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(action).toHaveFocus();
    }
  );

  it('keeps missing Episode stills as noninteractive fallbacks while rendering cast cards and crew', async () => {
    setup('/series/1/seasons/0/episodes/3');
    await screen.findByRole('heading', { name: 'Arrival', level: 1 });
    expect(
      screen.queryByRole('button', { name: 'Still from Arrival' })
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Regular Actor' }).closest('article')
    ).toHaveClass('cast-member');
    expect(
      screen.getByRole('link', { name: 'Guest Actor' }).closest('article')
    ).toHaveClass('cast-member');
    expect(screen.getByRole('link', { name: 'Episode Writer' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Next: 8/ })).toHaveAttribute(
      'href',
      '/series/1/seasons/0/episodes/8'
    );
    expect(screen.getByRole('link', { name: /Previous: 1/ })).toHaveAttribute(
      'href',
      '/series/1/seasons/0/episodes/1'
    );
  });
});

describe('Series details polish edge cases', () => {
  it('opens the series poster first and navigates the available poster collection', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        posterUrl: '/series-poster.jpg',
        posterSrcSet: '/series-large.jpg 2x, /series-original.jpg 3x',
        images: {
          posters: [
            {
              thumbnailUrl: '/series-poster.jpg',
              fullUrl: '/series-original.jpg',
            },
            {
              thumbnailUrl: '/alternate-poster.jpg',
              fullUrl: '/alternate-original.jpg',
            },
          ],
          backdrops: [
            {
              thumbnailUrl: '/backdrop.jpg',
              fullUrl: '/backdrop-original.jpg',
            },
          ],
          sections: {
            posters: { status: 'available' },
            backdrops: { status: 'available' },
          },
        },
      })
    );
    setup('/series/1');

    const poster = await screen.findByRole('img', {
      name: `Poster for ${series.title}`,
    });
    expect(poster).toHaveAttribute('src', '/series-poster.jpg');
    fireEvent.load(poster);
    const trigger = screen.getByRole('button', {
      name: `Open poster gallery for ${series.title}`,
    });
    await userEvent.click(trigger);

    const dialog = screen.getByRole('dialog', {
      name: `${series.title} photo viewer`,
    });
    expect(dialog.querySelector('img')).toHaveAttribute(
      'src',
      '/series-original.jpg'
    );
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(dialog.querySelector('img')).toHaveAttribute(
      'src',
      '/alternate-original.jpg'
    );
    expect(dialog.querySelector('img')).not.toHaveAttribute(
      'src',
      '/backdrop-original.jpg'
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the series hero dark when a backdrop image is available', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...series,
        backdropUrl: 'https://images.test/w500/series-backdrop.jpg',
      })
    );
    setup('/series/1');

    expect(
      await screen.findByRole('heading', { name: series.title, level: 1 })
    ).toBeVisible();
    expect(document.querySelector('.detail-page__backdrop')).toBeNull();
    expect(
      screen.getByRole('img', { name: `Poster for ${series.title}` })
    ).toBeInTheDocument();
  });

  it.each([
    { seasons: [] },
    { seasons: [season] },
    { seasons: [{ ...season, seasonNumber: 9, title: 'Season Nine' }] },
  ])(
    'handles empty, Specials-only and single sparse seasons %#',
    async ({ seasons }) => {
      fetchMock.mockResolvedValue(Response.json({ ...series, seasons }));
      setup('/series/1');
      await screen.findByRole('heading', { level: 1, name: series.title });
      if (!seasons.length) {
        expect(
          screen.getByText('No season information available.')
        ).toBeVisible();
        expect(screen.queryByRole('tablist', { name: 'Seasons' })).toBeNull();
      } else {
        const seasonTabs = within(
          screen.getByRole('tablist', { name: 'Seasons' })
        );
        expect(seasonTabs.getAllByRole('tab')).toHaveLength(1);
        expect(seasonTabs.getByRole('tab')).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(
          screen.queryByRole('button', { name: 'Next season' })
        ).toBeNull();
        expect(
          screen.getByRole('link', { name: 'View season details' })
        ).toHaveAttribute(
          'href',
          `/series/1/seasons/${seasons[0].seasonNumber}`
        );
        const panel = screen.getByRole('tabpanel', {
          name:
            seasons[0].seasonNumber === 0
              ? 'Specials, Season 0'
              : `Season ${seasons[0].seasonNumber}`,
        });
        expect(panel).not.toHaveTextContent('Air date');
        expect(panel).not.toHaveTextContent('undefined');
        expect(panel).not.toHaveTextContent('null');
      }
      expect(fetchMock).toHaveBeenCalledTimes(seasons.length ? 2 : 1);
    }
  );

  it('discloses every creator and network through native summaries', async () => {
    const user = userEvent.setup();
    const creators = Array.from({ length: 15 }, (_, index) => ({
      id: 100 + index,
      name: `Creator ${index}`,
    }));
    const networks = Array.from({ length: 12 }, (_, index) => ({
      id: 200 + index,
      name: `Network ${index}`,
      logoUrl: null,
      originCountry: null,
    }));
    fetchMock.mockResolvedValue(
      Response.json({ ...series, creators, networks })
    );
    setup('/series/1');
    await screen.findByRole('heading', { level: 1, name: series.title });
    const creatorSummary = screen.getByLabelText(
      'Creators: 15, expand or collapse'
    );
    const disclosure = creatorSummary.closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Creator 14' })).not.toBeVisible();
    creatorSummary.focus();
    await user.click(creatorSummary);
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Creator 14' })).toHaveAttribute(
      'href',
      '/person/114'
    );
    await user.click(creatorSummary);
    expect(disclosure).not.toHaveAttribute('open');
    expect(creatorSummary).toHaveFocus();
    const networkSummary = screen.getByLabelText(
      'Networks: 12, expand or collapse'
    );
    await user.click(networkSummary);
    expect(networkSummary.closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Network 11')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
