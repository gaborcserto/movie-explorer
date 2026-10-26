import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
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

function setup(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Link to="/tv/2">Other series</Link>
      <Link to="/tv/1/seasons/0/episodes/8">Other episode</Link>
      <Routes>
        <Route path="/tv/:id" element={<SeriesPage />} />
        <Route path="/tv/:id/seasons/:seasonNumber" element={<SeasonPage />} />
        <Route
          path="/tv/:id/seasons/:seasonNumber/episodes/:episodeNumber"
          element={<EpisodePage />}
        />
        <Route path="/person/:id" element={<h1>Person profile</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
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
      return Response.json(season);
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
    setup('/tv/1');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    setup('/tv/1');
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
    setup('/tv/1');
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
    ['/tv/1', 'The Journey'],
    ['/tv/1/seasons/0', 'Special stories'],
    ['/tv/1/seasons/0/episodes/3', 'Arrival'],
  ])(
    'uses the Movie page, hero and content framework at %s',
    async (path, title) => {
      const { container } = setup(path);
      const heading = await screen.findByRole('heading', {
        level: 1,
        name: title,
      });
      expect(heading).toHaveClass('movie-details__title');
      expect(heading.closest('.movie-details__container')).not.toBeNull();
      expect(
        heading.closest('.detail-page__hero > .movie-details.container')
      ).not.toBeNull();
      expect(container.querySelector('header')).toHaveClass(
        'detail-page__navigation',
        'movie-details',
        'container'
      );
      expect(
        container.querySelector('.movie-details__metadata dt')
      ).not.toBeNull();
      expect(
        container.querySelector('.details-section')?.closest('.container')
      ).toHaveClass('movie-details__lower-content');
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
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
    setup('/tv/1');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    setup('/tv/1');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    setup('/tv/1');
    expect(
      await screen.findByRole('heading', { name: 'The Journey' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(
      Response.json({ videos: [], availability: { status: 'available' } })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry videos' }));
    expect(await screen.findByText('No videos available.')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/api/v1/series/1/videos'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: 'Retry images' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'The Journey' })
    ).toBeInTheDocument();
  });

  it('aborts section recovery on navigation and ignores an obsolete result', async () => {
    setup('/tv/1');
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
    setup('/tv/1');
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
    expect(screen.getByRole('link', { name: 'View episodes' })).toHaveAttribute(
      'href',
      '/tv/1/seasons/0'
    );
    await user.keyboard('{ArrowRight}');
    expect(first).toHaveFocus();
    expect(screen.getByRole('link', { name: 'View episodes' })).toHaveAttribute(
      'href',
      '/tv/1/seasons/1'
    );
    await user.click(screen.getByRole('button', { name: 'Next season' }));
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    if (originalClientWidth)
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        originalClientWidth
      );
    else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    if (originalScrollWidth)
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollWidth',
        originalScrollWidth
      );
    else delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
  });

  it('shows season arrows from measured overflow and updates them after resize and scrolling', async () => {
    const manySeasons = Array.from({ length: 15 }, (_, index) => ({
      ...season,
      id: 200 + index,
      seasonNumber: index + 1,
      title: `Season ${index + 1}`,
    }));
    let resize: ResizeObserverCallback | undefined;
    class ResizeObserverMock {
      private readonly observed = new Set<Element>();

      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }

      observe(element: Element) {
        this.observed.add(element);
      }

      disconnect() {
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
        if (!this.classList.contains('season-tabs')) return 0;
        return (this as HTMLElement).dataset.overflow === 'yes' ? 1200 : 400;
      },
    });
    fetchMock.mockResolvedValue(
      Response.json({ ...series, seasons: manySeasons })
    );
    setup('/tv/1');
    const first = await screen.findByRole('tab', { name: 'Season 1' });
    expect(screen.queryByRole('button', { name: 'Next season' })).toBeNull();
    const list = screen.getByRole('tablist', { name: 'Seasons' });
    list.setAttribute('data-overflow', 'yes');
    act(() => resize?.([], {} as ResizeObserver));
    const next = screen.getByRole('button', { name: 'Next season' });
    const previous = screen.getByRole('button', { name: 'Previous season' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(first).toHaveAttribute('aria-selected', 'true');
    (list as HTMLDivElement).scrollLeft = 400;
    fireEvent.scroll(list);
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();
    (list as HTMLDivElement).scrollLeft = 800;
    fireEvent.scroll(list);
    expect(next).toBeDisabled();
  });

  it('uses actual season choices with accessible keyboard controls', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      return Response.json(
        path.includes('/seasons/')
          ? {
              ...season,
              seasonNumber: Number(path.split('/').at(-1)),
              episodes: [],
              episodeCount: 0,
            }
          : series
      );
    });
    setup('/tv/1/seasons/0');
    const selector = await screen.findByRole('combobox', { name: 'Season' });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await userEvent.selectOptions(selector, '5');
    expect(await screen.findByRole('combobox', { name: 'Season' })).toHaveValue(
      '5'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('presents Retry-After guidance through the shared error state', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '12' } })
    );
    setup('/tv/1');
    expect(
      await screen.findByRole('heading', { name: 'Please try again shortly' })
    ).toBeInTheDocument();
    expect(screen.getByText(/wait about 12 seconds/)).toBeInTheDocument();
  });
  it('renders series metadata, named seasons and separate Specials without per-season calls', async () => {
    setup('/tv/1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Journey' })
    ).toBeInTheDocument();
    expect(screen.getByText('Original Journey')).toBeInTheDocument();
    expect(screen.getByText('No overview available.')).toBeInTheDocument();
    expect(screen.getByText('Returning Series')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(
      screen.getByLabelText('TMDB rating 8.5 out of 10 from 200 votes')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Creator' })).toHaveAttribute(
      'href',
      '/person/7'
    );
    expect(screen.getByRole('link', { name: 'View episodes' })).toHaveAttribute(
      'href',
      '/tv/1/seasons/0'
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Season 5' }));
    expect(
      screen.getByRole('heading', { name: 'Season 5: Book Five' })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'View episodes' })).toHaveAttribute(
      'href',
      '/tv/1/seasons/5'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.title).toBe('The Journey | Movie Explorer');
  });

  it('navigates series → Specials → episode and uses actual sparse neighbors with no redundant season fetch', async () => {
    const user = userEvent.setup();
    setup('/tv/1');
    await user.click(
      await screen.findByRole('link', { name: 'View episodes' })
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Special stories' })
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveValue('0');
    expect(
      screen.getByText('No season overview available.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '3. Arrival' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arrival' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Journey' })).toHaveAttribute(
      'href',
      '/tv/1'
    );
    expect(
      screen.getByRole('link', { name: 'Previous: 1. Beginning' })
    ).toHaveAttribute('href', '/tv/1/seasons/0/episodes/1');
    expect(
      screen.getByRole('link', { name: 'Next: 8. Departure' })
    ).toHaveAttribute('href', '/tv/1/seasons/0/episodes/8');
    expect(screen.getByRole('link', { name: 'Guest Actor' })).toHaveAttribute(
      'href',
      '/person/12'
    );
    expect(screen.getByText(/Writer, Story/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);

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
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('loads episode URLs directly with one concurrent season request', async () => {
    setup('/tv/1/seasons/0/episodes/3');
    expect(
      await screen.findByRole('heading', { name: 'Arrival', level: 1 })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Next: 8. Departure' })
    ).toBeInTheDocument();
    expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    expect(screen.getByText('24 min')).toBeInTheDocument();
    expect(
      screen.getByLabelText('TMDB rating 0 out of 10 from 0 votes')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('link', { name: 'Series 1' })).toHaveAttribute(
      'href',
      '/tv/1'
    );
  });

  it('keeps episode details when optional season context fails and supports retry', async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).includes('/episodes/')
        ? Response.json(episode)
        : new Response('', { status: 502 })
    );
    setup('/tv/1/seasons/0/episodes/3');
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
    setup('/tv/1/seasons/0');
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
    setup('/tv/1/seasons/0/episodes/3');
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
    setup('/tv/1/seasons/0');
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
    setup('/tv/1/seasons/0/episodes/3');
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
    '/tv/0',
    '/tv/1/seasons/-1',
    '/tv/1/seasons/0/episodes/0',
    '/tv/1/seasons/-1/episodes/1',
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
    setup('/tv/1');
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => resolve(new Response('', { status: 404 })));
    expect(await screen.findByText('Series not found')).toBeInTheDocument();
  });

  it('supports provider error recovery', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }));
    setup('/tv/1');
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
    setup('/tv/1');
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
    setup('/tv/1/seasons/0/episodes/3');
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
        if (url.includes('/episodes/'))
          return Response.json({
            ...episode,
            stillUrl: image,
            stillSrcSet: srcSet,
          });
        if (url.includes('/seasons/'))
          return Response.json({
            ...season,
            posterUrl: image,
            posterSrcSet: srcSet,
          });
        return Response.json({
          ...series,
          backdropUrl: 'https://images.test/w500/backdrop.jpg',
        });
      });
      setup(
        kind === 'season' ? '/tv/1/seasons/0' : '/tv/1/seasons/0/episodes/3'
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
      if (thumbnail) fireEvent.load(thumbnail);
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
    setup('/tv/1/seasons/0/episodes/3');
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
      '/tv/1/seasons/0/episodes/8'
    );
    expect(screen.getByRole('link', { name: /Previous: 1/ })).toHaveAttribute(
      'href',
      '/tv/1/seasons/0/episodes/1'
    );
  });
});

describe('Series details polish edge cases', () => {
  it.each([
    { seasons: [] },
    { seasons: [season] },
    { seasons: [{ ...season, seasonNumber: 9, title: 'Season Nine' }] },
  ])(
    'handles empty, Specials-only and single sparse seasons %#',
    async ({ seasons }) => {
      fetchMock.mockResolvedValue(Response.json({ ...series, seasons }));
      setup('/tv/1');
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
          screen.getByRole('link', { name: 'View episodes' })
        ).toHaveAttribute('href', `/tv/1/seasons/${seasons[0].seasonNumber}`);
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
      expect(fetchMock).toHaveBeenCalledTimes(1);
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
    setup('/tv/1');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
