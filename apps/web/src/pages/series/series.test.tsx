import {
  act,
  fireEvent,
  render,
  screen,
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
afterEach(() => vi.unstubAllGlobals());

describe('Series hierarchy', () => {
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

  it('reveals long season catalogs locally and keeps Specials reachable', async () => {
    const manySeasons = Array.from({ length: 8 }, (_, index) => ({
      ...season,
      id: 100 + index,
      seasonNumber: index + 1,
      title: `Book ${index + 1}`,
    }));
    fetchMock.mockResolvedValue(
      Response.json({ ...series, seasons: [...manySeasons, season] })
    );
    setup('/tv/1');
    const reveal = await screen.findByRole('button', {
      name: 'Show all seasons',
    });
    expect(
      screen.queryByRole('link', { name: 'Season 8: Book 8' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Specials: Special stories' })
    ).toBeInTheDocument();
    fireEvent.click(reveal);
    expect(
      screen.getByRole('link', { name: 'Season 8: Book 8' })
    ).toBeInTheDocument();
    expect(reveal).toHaveAttribute('aria-expanded', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(
      screen.getByRole('link', { name: 'Season 5: Book Five' })
    ).toHaveAttribute('href', '/tv/1/seasons/5');
    expect(
      screen.getByRole('link', { name: 'Specials: Special stories' })
    ).toHaveAttribute('href', '/tv/1/seasons/0');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.title).toBe('The Journey | Movie Explorer');
  });

  it('navigates series → Specials → episode and uses actual sparse neighbors with no redundant season fetch', async () => {
    const user = userEvent.setup();
    setup('/tv/1');
    await user.click(
      await screen.findByRole('link', { name: 'Specials: Special stories' })
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
