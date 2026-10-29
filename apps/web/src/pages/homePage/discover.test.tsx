import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type {
  SearchResponse,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import {
  getDiscoverySection,
  getStreamingProviderSection,
  getStreamingProviders,
} from '../../util/apiUtils';
import DiscoverPage from './discover';

vi.mock('../../util/apiUtils');

const emptyResponse: SearchResponse = {
  results: [],
  page: 1,
  totalPages: 1,
  totalResults: 0,
};
const streamingProviders: StreamingProviderInfo[] = [
  { id: 101, name: 'Netflix' },
  { id: 102, name: 'SkyShowtime' },
  { id: 103, name: 'Disney Plus' },
  { id: 104, name: 'Max' },
  { id: 105, name: 'Amazon Prime Video' },
  { id: 106, name: 'Apple TV Plus' },
];

const renderDiscover = () =>
  render(
    <MemoryRouter>
      <DiscoverPage />
    </MemoryRouter>
  );

function CurrentPath() {
  const location = useLocation();

  return <output data-testid="current-path">{location.pathname}</output>;
}

describe('Discover page', () => {
  beforeEach(() => {
    vi.mocked(getStreamingProviders).mockResolvedValue(streamingProviders);
    vi.mocked(getStreamingProviderSection).mockResolvedValue(emptyResponse);
    vi.mocked(getDiscoverySection).mockImplementation(async (section) =>
      section === 'trending'
        ? {
            results: [
              {
                id: 12,
                mediaType: 'movie',
                title: 'Trending Feature',
                posterUrl: '/poster.jpg',
                backdropUrl: '/backdrop.jpg',
                releaseDate: '2025-04-12',
                description: 'A featured story.',
                rating: 8.2,
              },
              {
                id: 13,
                mediaType: 'tv',
                title: 'Featured Series',
                posterUrl: '/series-poster.jpg',
                backdropUrl: '/series-backdrop.jpg',
                firstAirDate: '2024-03-01',
                rating: 7.4,
              },
            ],
            page: 1,
            totalPages: 1,
            totalResults: 2,
          }
        : emptyResponse
    );
  });

  it('renders featured content and consolidated movie and series categories', async () => {
    const user = userEvent.setup();
    const { container } = renderDiscover();

    expect(
      container.querySelector('.discover-page.container')
    ).toBeInTheDocument();
    expect(
      container.querySelector('.discover-page__content.container')
    ).toBeNull();

    expect(
      await screen.findByRole('heading', { name: 'Trending Feature' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore title/ })).toHaveAttribute(
      'href',
      '/movie/12'
    );
    await user.click(
      screen.getByRole('button', { name: 'Next featured title' })
    );
    expect(
      await screen.findByRole('heading', { name: 'Featured Series' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore title/ })).toHaveAttribute(
      'href',
      '/series/13'
    );
    expect(
      await screen.findByRole('link', { name: 'Featured Series' })
    ).toHaveAttribute('href', '/series/13');
    expect(screen.getByRole('heading', { name: 'Movies' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Series' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add to Watchlist Trending Feature' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Movies' }).querySelector('svg')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Series' }).querySelector('svg')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Streaming' }).querySelector('svg')
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Trending' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('group', { name: 'Scroll Trending Movies cards' })
    ).toBeInTheDocument();
    expect(getDiscoverySection).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('Your Library')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular People')).not.toBeInTheDocument();
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'trending',
      expect.any(AbortSignal),
      1
    );
  });

  it('synchronizes featured navigation, indicators, slide details, and route state', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DiscoverPage />
        <CurrentPath />
      </MemoryRouter>
    );

    await screen.findByRole('heading', {
      name: 'Trending Feature',
    });
    const featured = screen.getByRole('region', {
      name: 'Featured trending title',
    });
    const visual = featured.querySelector('.discover-featured__visual');

    expect(visual).toHaveAttribute('aria-hidden', 'true');
    expect(visual).toContainElement(
      featured.querySelector('.discover-featured__image--active')
    );
    expect(within(featured).getByText('A featured story.')).toBeInTheDocument();
    expect(within(featured).getByText('2025')).toBeInTheDocument();
    expect(within(featured).getByText(/8\.2 \/ 10/)).toBeInTheDocument();
    expect(
      featured.querySelector('.discover-featured__image--active')
    ).toHaveAttribute('src', '/backdrop.jpg');

    await user.click(
      screen.getByRole('button', { name: 'Next featured title' })
    );
    expect(
      await screen.findByRole('heading', { name: 'Featured Series' })
    ).toBeInTheDocument();
    expect(within(featured).getByText('2024')).toBeInTheDocument();
    expect(within(featured).getByText(/7\.4 \/ 10/)).toBeInTheDocument();
    expect(
      featured.querySelector('.discover-featured__image--active')
    ).toHaveAttribute('src', '/series-backdrop.jpg');
    expect(
      within(featured).getByRole('button', { name: 'Show Featured Series' })
    ).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/');

    await user.click(
      within(featured).getByRole('button', { name: 'Show Trending Feature' })
    );
    expect(
      within(featured).getByRole('heading', { name: 'Trending Feature' })
    ).toBeInTheDocument();
    expect(
      featured.querySelector('.discover-featured__image--active')
    ).toHaveAttribute('src', '/backdrop.jpg');
    expect(
      within(featured).getByRole('button', { name: 'Show Trending Feature' })
    ).toHaveAttribute('aria-current', 'true');

    const nextButton = screen.getByRole('button', {
      name: 'Next featured title',
    });
    nextButton.focus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Featured Series' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
  });

  it('uses the featured fallback when backdrops are missing', async () => {
    vi.mocked(getDiscoverySection).mockResolvedValue({
      results: [
        {
          id: 90,
          mediaType: 'movie',
          title: 'No Backdrop',
          posterUrl: '/poster.jpg',
        },
      ],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });

    renderDiscover();

    expect(
      await screen.findByRole('heading', { name: 'Find your next favorite.' })
    ).toBeInTheDocument();
  });

  it('keeps rapid featured navigation synchronized with its backdrop and indicator', async () => {
    renderDiscover();

    await screen.findByRole('heading', { name: 'Trending Feature' });
    const nextButton = screen.getByRole('button', {
      name: 'Next featured title',
    });

    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(
      await screen.findByRole('heading', { name: 'Featured Series' })
    ).toBeInTheDocument();
    expect(
      document.querySelector('.discover-featured__image--active')
    ).toHaveAttribute('src', '/series-backdrop.jpg');
    expect(
      screen.getByRole('button', { name: 'Show Featured Series' })
    ).toHaveAttribute('aria-current', 'true');
  });

  it('loads the selected movie and series categories without losing each selection', async () => {
    const user = userEvent.setup();
    renderDiscover();

    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      1
    );
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Series discovery categories' })
      ).getByRole('tab', { name: 'New' })
    );
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'new-series',
      expect.any(AbortSignal),
      1
    );
    const providerTabs = await screen.findByRole('tablist', {
      name: 'Streaming providers available in Hungary',
    });
    const skyShowtimeTab = within(providerTabs).getByRole('tab', {
      name: 'SkyShowtime',
    });
    await user.click(skyShowtimeTab);
    expect(skyShowtimeTab).toHaveAttribute('aria-selected', 'true');
    expect(getStreamingProviderSection).toHaveBeenCalledWith(
      102,
      'HU',
      1,
      expect.any(AbortSignal)
    );

    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Trending' })
    );
    expect(
      within(
        screen.getByRole('tablist', { name: 'Series discovery categories' })
      ).getByRole('tab', { name: 'New' })
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('supports arrow key selection and focus movement for movie category tabs', async () => {
    const user = userEvent.setup();
    renderDiscover();

    const movieTabs = screen.getByRole('tablist', {
      name: 'Movie discovery categories',
    });
    const trendingTab = within(movieTabs).getByRole('tab', {
      name: 'Trending',
    });
    trendingTab.focus();
    await user.keyboard('{ArrowRight}');

    const popularTab = within(movieTabs).getByRole('tab', { name: 'Popular' });
    expect(popularTab).toHaveFocus();
    expect(popularTab).toHaveAttribute('aria-selected', 'true');
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      1
    );
  });

  it('filters incomplete new series, fills five slots across pages, and keeps unrated titles', async () => {
    const user = userEvent.setup();
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) => {
        if (section !== 'new-series') {
          return emptyResponse;
        }

        const results =
          page === 1
            ? [
                {
                  id: 1,
                  mediaType: 'tv' as const,
                  title: '   ',
                  posterUrl: '/blank-title.jpg',
                },
                {
                  id: 2,
                  mediaType: 'tv' as const,
                  title: 'Missing Poster',
                  posterUrl: '',
                },
                {
                  id: 3,
                  mediaType: 'tv' as const,
                  title: 'Unrated Upcoming Series',
                  posterUrl: '/unrated.jpg',
                  rating: 0,
                },
                {
                  id: 4,
                  mediaType: 'tv' as const,
                  title: 'New Series 4',
                  posterUrl: '/4.jpg',
                },
              ]
            : [
                {
                  id: 5,
                  mediaType: 'tv' as const,
                  title: 'New Series 5',
                  posterUrl: '/5.jpg',
                },
                {
                  id: 6,
                  mediaType: 'tv' as const,
                  title: 'New Series 6',
                  posterUrl: '/6.jpg',
                },
                {
                  id: 7,
                  mediaType: 'tv' as const,
                  title: 'New Series 7',
                  posterUrl: '/7.jpg',
                },
                {
                  id: 0,
                  mediaType: 'tv' as const,
                  title: 'Invalid Identity',
                  posterUrl: '/invalid.jpg',
                },
              ];

        return { results, page, totalPages: 2, totalResults: 8 };
      }
    );

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Series discovery categories' })
      ).getByRole('tab', { name: 'New' })
    );

    const grid = await screen.findByRole('region', { name: 'New Series' });
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(5);
    expect(
      screen.getByRole('link', { name: 'Unrated Upcoming Series' })
    ).toHaveAttribute('href', '/series/3');
    expect(screen.queryByRole('link', { name: 'Missing Poster' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Invalid Identity' })).toBeNull();
    expect(screen.queryByText(/0\.0 \/ 10/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'new-series',
      expect.any(AbortSignal),
      2
    );
  });

  it('shows fewer than five eligible results when pagination is exhausted', async () => {
    const user = userEvent.setup();
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) => {
        if (section !== 'popular-movies') {
          return emptyResponse;
        }

        return {
          results: [
            {
              id: page,
              mediaType: 'movie',
              title: `Eligible ${page}`,
              posterUrl: `/eligible-${page}.jpg`,
            },
          ],
          page,
          totalPages: 2,
          totalResults: 2,
        };
      }
    );

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );

    const grid = await screen.findByRole('region', { name: 'Popular Movies' });
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      2
    );
  });

  it('bounds page scans for feeds with no eligible results', async () => {
    const user = userEvent.setup();
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) =>
        section === 'popular-movies'
          ? { ...emptyResponse, page, totalPages: 500 }
          : emptyResponse
    );

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );
    const panel = await screen.findByRole('tabpanel', { name: 'Popular' });
    await within(panel).findByText('No titles are available right now.');

    const pagesRequested = () =>
      vi
        .mocked(getDiscoverySection)
        .mock.calls.filter(([section]) => section === 'popular-movies')
        .map(([, , page]) => page);

    await waitFor(() => expect(pagesRequested()).toEqual([1, 2, 3]));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(pagesRequested()).toEqual([1, 2, 3, 4, 5, 6]));
  });

  it('shows mixed provider results with the proper detail routes and keyboard tabs', async () => {
    const user = userEvent.setup();
    vi.mocked(getStreamingProviderSection).mockImplementation(
      async (providerId) =>
        providerId === 101
          ? {
              results: [
                {
                  id: 50,
                  mediaType: 'movie',
                  title: 'Stream Movie',
                  posterUrl: '/stream-movie.jpg',
                },
                {
                  id: 51,
                  mediaType: 'tv',
                  title: 'Stream Series',
                  posterUrl: '/stream-series.jpg',
                },
              ],
              page: 1,
              totalPages: 1,
              totalResults: 2,
            }
          : emptyResponse
    );

    renderDiscover();

    expect(getStreamingProviders).toHaveBeenCalledWith(
      'HU',
      expect.any(AbortSignal)
    );
    expect(
      await screen.findByRole('link', { name: 'Stream Movie' })
    ).toHaveAttribute('href', '/movie/50');
    expect(screen.getByRole('link', { name: 'Stream Series' })).toHaveAttribute(
      'href',
      '/series/51'
    );

    const providerTabs = screen.getByRole('tablist', {
      name: 'Streaming providers available in Hungary',
    });
    const netflixTab = within(providerTabs).getByRole('tab', {
      name: 'Netflix',
    });
    netflixTab.focus();
    await user.keyboard('{ArrowRight}');

    const skyShowtimeTab = within(providerTabs).getByRole('tab', {
      name: 'SkyShowtime',
    });
    expect(skyShowtimeTab).toHaveFocus();
    expect(skyShowtimeTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.queryByRole('link', { name: 'Stream Movie' })
    ).not.toBeInTheDocument();
  });

  it('scrolls the selected provider fully into view within its own tab strip', async () => {
    const user = userEvent.setup();

    renderDiscover();

    const providerTabs = await screen.findByRole('tablist', {
      name: 'Streaming providers available in Hungary',
    });
    const appleTab = within(providerTabs).getByRole('tab', {
      name: 'Apple TV+',
    });
    const cardRail = document.querySelector<HTMLElement>(
      '.discover-row__viewport'
    );

    if (!cardRail) {
      throw new Error('The Movies card rail was not rendered.');
    }

    const providerTabsBounds = vi
      .spyOn(providerTabs, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 250,
        height: 44,
        top: 0,
        right: 250,
        bottom: 44,
        left: 0,
        toJSON: () => ({}),
      });
    const appleTabBounds = vi
      .spyOn(appleTab, 'getBoundingClientRect')
      .mockReturnValue({
        x: 310,
        y: 0,
        width: 80,
        height: 44,
        top: 0,
        right: 390,
        bottom: 44,
        left: 310,
        toJSON: () => ({}),
      });
    const pageScroll = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {});
    providerTabs.scrollLeft = 0;
    cardRail.scrollLeft = 24;

    await user.click(appleTab);

    await waitFor(() => {
      expect(providerTabs.scrollLeft).toBe(140);
      expect(getStreamingProviderSection).toHaveBeenCalledWith(
        106,
        'HU',
        1,
        expect.any(AbortSignal)
      );
    });
    expect(appleTab).toHaveAttribute('aria-selected', 'true');
    expect(cardRail.scrollLeft).toBe(24);
    expect(pageScroll).not.toHaveBeenCalled();

    providerTabsBounds.mockRestore();
    appleTabBounds.mockRestore();
    pageScroll.mockRestore();
  });

  it('omits unsupported providers and explains regional availability', async () => {
    vi.mocked(getStreamingProviders).mockResolvedValue([
      { id: 901, name: 'Netflix' },
    ]);

    renderDiscover();

    const providerTabs = await screen.findByRole('tablist', {
      name: 'Streaming providers available in Hungary',
    });
    expect(within(providerTabs).getAllByRole('tab')).toHaveLength(1);
    await waitFor(() =>
      expect(
        within(providerTabs).getByRole('tab', { name: 'Netflix' })
      ).toHaveAttribute('aria-selected', 'true')
    );
    expect(
      screen.getByText('Providers not listed for Hungary are omitted.')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(getStreamingProviderSection).toHaveBeenCalledWith(
        901,
        'HU',
        1,
        expect.any(AbortSignal)
      )
    );
  });

  it('hides streaming results that do not have a usable poster', async () => {
    vi.mocked(getStreamingProviderSection).mockResolvedValue({
      results: [
        {
          id: 71,
          mediaType: 'movie',
          title: 'Posterless Stream',
        },
        {
          id: 72,
          mediaType: 'tv',
          title: '   ',
          posterUrl: '/blank-title.jpg',
        },
        {
          id: 0,
          mediaType: 'movie',
          title: 'Invalid Identity',
          posterUrl: '/invalid.jpg',
        },
      ],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });

    renderDiscover();

    const streaming = screen.getByRole('region', { name: 'Streaming' });
    expect(
      await within(streaming).findByText('No titles are available right now.')
    ).toBeInTheDocument();
    expect(
      within(streaming).queryByRole('link', { name: 'Posterless Stream' })
    ).toBeNull();
  });

  it('keeps the featured title readable when its backdrop image fails', async () => {
    const { container } = renderDiscover();
    const backdrop = await screen.findByRole('heading', {
      name: 'Trending Feature',
    });
    const backdropImage = container.querySelector('.discover-featured__image');

    if (!backdropImage) {
      throw new Error('Expected a featured backdrop image');
    }

    fireEvent.error(backdropImage);

    expect(backdrop).toBeInTheDocument();
    expect(
      container.querySelector('.discover-featured__image[src="/backdrop.jpg"]')
    ).toBeNull();
  });

  it('keeps section failures local without rendering removed homepage rows', async () => {
    vi.mocked(getDiscoverySection).mockRejectedValue(new Error('offline'));

    renderDiscover();

    expect(
      await screen.findAllByText('This collection could not load.')
    ).toHaveLength(2);
    expect(screen.queryByText('Your Library')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular People')).not.toBeInTheDocument();
  });

  it('keeps successful discovery rows visible when another section fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getDiscoverySection).mockImplementation(async (section) => {
      if (section === 'new-movies') {
        throw new Error('temporary failure');
      }

      return section === 'trending'
        ? {
            results: [
              {
                id: 12,
                mediaType: 'movie',
                title: 'Trending Feature',
                posterUrl: '/poster.jpg',
                backdropUrl: '/backdrop.jpg',
              },
            ],
            page: 1,
            totalPages: 1,
            totalResults: 1,
          }
        : emptyResponse;
    });

    renderDiscover();

    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'New' })
    );

    expect(
      await screen.findByRole('heading', { name: 'Trending Feature' })
    ).toBeInTheDocument();
    expect(
      await screen.findAllByText('This collection could not load.')
    ).toHaveLength(1);
  });

  it('retries only the failed discovery section', async () => {
    const user = userEvent.setup();
    vi.mocked(getDiscoverySection).mockImplementation(async (section) => {
      if (section === 'new-movies') {
        throw new Error('temporary failure');
      }

      return emptyResponse;
    });

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'New' })
    );
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(getDiscoverySection).toHaveBeenCalledTimes(5);
    expect(getDiscoverySection).toHaveBeenLastCalledWith(
      'new-movies',
      expect.any(AbortSignal),
      1
    );
  });

  it('shows five items, reveals cached items in batches of five, and appends unique page results', async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      mediaType: 'movie' as const,
      title: `Popular ${index + 1}`,
      posterUrl: `/poster-${index + 1}.jpg`,
    }));
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) => {
        if (section === 'popular-movies') {
          return {
            results:
              page === 1
                ? firstPage
                : [
                    firstPage[0],
                    {
                      id: 21,
                      mediaType: 'movie' as const,
                      title: 'Popular 21',
                      posterUrl: '/poster-21.jpg',
                    },
                  ],
            page,
            totalPages: 2,
            totalResults: 21,
          };
        }

        return emptyResponse;
      }
    );

    const { container } = renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );

    const grid = await screen.findByRole('region', { name: 'Popular Movies' });
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(5);
    expect(container.querySelector('.discover-featured')).toBeInTheDocument();
    expect(grid.closest('.discover-featured')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(10);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(15);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(
      await screen.findByRole('link', { name: 'Popular 21' })
    ).toBeInTheDocument();
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(21);
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      2
    );
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('filters incomplete results before filling five positions and paginating', async () => {
    const user = userEvent.setup();
    const result = (
      id: number,
      posterUrl?: string,
      title = `Popular ${id}`
    ) => ({
      id,
      mediaType: 'movie' as const,
      title,
      ...(posterUrl !== undefined && { posterUrl }),
    });
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) => {
        if (section !== 'popular-movies') {
          return emptyResponse;
        }

        const pages: Record<number, ReturnType<typeof result>[]> = {
          1: [
            result(1, '/1.jpg'),
            result(2, ''),
            result(3, '/3.jpg'),
            result(10, '/10.jpg', '   '),
            result(0, '/0.jpg'),
          ],
          2: [result(1, '/1-duplicate.jpg'), result(4, '/4.jpg')],
          3: [result(5, '/5.jpg'), result(6, '/6.jpg')],
          4: [result(7)],
          5: [result(7, '/7.jpg'), result(8, '/8.jpg'), result(9, '/9.jpg')],
        };

        return {
          results: pages[page] ?? [],
          page,
          totalPages: 5,
          totalResults: 9,
        };
      }
    );

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );

    const grid = await screen.findByRole('region', { name: 'Popular Movies' });
    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(5);
    expect(screen.queryByRole('link', { name: 'Popular 2' })).toBeNull();
    expect(screen.queryByRole('link', { name: '   ' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Popular 0' })).toBeNull();
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      3
    );

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(grid.querySelectorAll('.discover-row__card')).toHaveLength(8);
    expect(screen.getAllByRole('link', { name: 'Popular 1' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(getDiscoverySection).toHaveBeenCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      5
    );
  });

  it('keeps a stable category content viewport when switching into an empty feed', async () => {
    const user = userEvent.setup();
    renderDiscover();

    const movieSection = screen.getByRole('region', { name: 'Movies' });
    const moviePanel = within(movieSection).getByRole('tabpanel', {
      name: 'Trending',
    });
    expect(
      moviePanel.querySelector('.discover-row__viewport')
    ).toBeInTheDocument();

    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Upcoming' })
    );

    const upcomingPanel = await within(movieSection).findByRole('tabpanel', {
      name: 'Upcoming',
    });
    expect(
      upcomingPanel.querySelector('.discover-row__viewport')
    ).toBeInTheDocument();
    expect(
      await within(upcomingPanel).findByText(
        'No titles are available right now.'
      )
    ).toBeInTheDocument();
  });

  it('keeps Load more errors local and retries the same page', async () => {
    const user = userEvent.setup();
    let pageTwoFails = true;
    vi.mocked(getDiscoverySection).mockImplementation(
      async (section, _signal, page = 1) => {
        if (section !== 'popular-movies') {
          return emptyResponse;
        }
        if (page === 2 && pageTwoFails) {
          pageTwoFails = false;
          throw new Error('temporary failure');
        }

        return {
          results:
            page === 1
              ? Array.from({ length: 10 }, (_, index) => ({
                  id: index + 1,
                  mediaType: 'movie' as const,
                  title: `Popular ${index + 1}`,
                  posterUrl: `/poster-${index + 1}.jpg`,
                }))
              : [
                  {
                    id: 11,
                    mediaType: 'movie' as const,
                    title: 'Popular 11',
                    posterUrl: '/poster-11.jpg',
                  },
                ],
          page,
          totalPages: 2,
          totalResults: 11,
        };
      }
    );

    renderDiscover();
    await user.click(
      within(
        screen.getByRole('tablist', { name: 'Movie discovery categories' })
      ).getByRole('tab', { name: 'Popular' })
    );
    await user.click(await screen.findByRole('button', { name: 'Load more' }));
    await user.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'More titles could not load.'
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('link', { name: 'Popular 11' })
    ).toBeInTheDocument();
    expect(getDiscoverySection).toHaveBeenCalledTimes(6);
    expect(getDiscoverySection).toHaveBeenLastCalledWith(
      'popular-movies',
      expect.any(AbortSignal),
      2
    );
  });
});
