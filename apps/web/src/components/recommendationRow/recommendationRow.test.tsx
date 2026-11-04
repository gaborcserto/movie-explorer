import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type {
  RecommendationTitle,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import RecommendationRow from '.';
import HomeRecommendations from '../../pages/homePage/homeRecommendations';
import DetailRecommendations from '../detailRecommendations';
import {
  getRecommendations,
  getRelatedTitles,
  getMovieCollection,
} from '../../util/apiUtils';
import { ApiRequestError } from '../../util/apiErrors';
import useRecommendationResource from './useRecommendationResource';

vi.mock('../../util/apiUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/apiUtils')>()),
  getRecommendations: vi.fn(),
  getRelatedTitles: vi.fn(),
  getMovieCollection: vi.fn(),
}));

const title = (
  id: number,
  mediaType: 'movie' | 'tv' = 'movie'
): RecommendationTitle => ({
  id,
  mediaType,
  title: `Title ${id}`,
  posterUrl: `/poster-${id}.jpg`,
});
const empty: RelatedTitlesResponse = { results: [], availability: 'available' };

const wrap = (node: React.ReactNode) => <MemoryRouter>{node}</MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMovieCollection).mockResolvedValue({
    collection: null,
    results: [],
    availability: 'available',
  });
  vi.mocked(getRecommendations).mockImplementation(async (category) => ({
    ...empty,
    category,
    candidateCount: 0,
  }));
  vi.mocked(getRelatedTitles).mockResolvedValue(empty);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it('ignores late request failures after the hook source changes', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  type Response = Awaited<ReturnType<typeof getRecommendations>>;
  let rejectFirst!: (reason: Error) => void;
  let resolveSecond!: (value: Response) => void;
  const first = new Promise<Response>((_resolve, reject) => {
    rejectFirst = reject;
  });
  const second = new Promise<Response>((resolve) => {
    resolveSecond = resolve;
  });
  vi.mocked(getRecommendations)
    .mockReturnValueOnce(first)
    .mockReturnValueOnce(second);
  const { result, rerender } = renderHook(
    ({ category }: { category: Response['category'] }) =>
      useRecommendationResource({ category }),
    { initialProps: { category: 'popular-movies' } }
  );
  await waitFor(() => expect(getRecommendations).toHaveBeenCalledTimes(1));

  rerender({ category: 'popular-series' });
  expect(result.current.data).toBeUndefined();
  expect(result.current.pending).toBe(true);
  expect(vi.mocked(getRecommendations).mock.calls[0][1]?.aborted).toBe(true);
  await waitFor(() => expect(getRecommendations).toHaveBeenCalledTimes(2));

  const response: Response = {
    ...empty,
    category: 'popular-series',
    candidateCount: 0,
  };
  await act(async () => resolveSecond(response));
  expect(result.current.data).toBe(response);
  expect(result.current.pending).toBe(false);

  await act(async () => rejectFirst(new Error('obsolete')));
  expect(result.current.data).toBe(response);
  expect(result.current.error).toBeUndefined();
  expect(result.current.pending).toBe(false);
});

it('keeps partial Series results and retry independent from pending Movies', async () => {
  let resolveMovies:
    | ((value: Awaited<ReturnType<typeof getRecommendations>>) => void)
    | undefined;
  vi.mocked(getRecommendations).mockImplementation(async (category) => {
    if (category === 'popular-movies') {
      return new Promise((resolve) => {
        resolveMovies = resolve;
      });
    }

    return {
      category,
      candidateCount: 1,
      availability: 'partial',
      results: [title(8, 'tv')],
    };
  });
  render(wrap(<HomeRecommendations />));
  await waitFor(() => expect(getRecommendations).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Loading popular movies...')).toBeVisible();
  const tabs = within(
    screen.getByRole('tablist', { name: 'Recommendation categories' })
  );

  await userEvent.click(tabs.getByRole('tab', { name: 'Series' }));
  const series = screen.getByRole('region', { name: 'Popular Series' });
  expect(
    await within(series).findByRole('link', { name: 'Title 8' })
  ).toHaveAttribute('href', '/series/8');
  expect(
    within(series).getByText('Some recommendations are unavailable.')
  ).toBeVisible();
  vi.mocked(getRecommendations).mockResolvedValue({
    category: 'popular-series',
    candidateCount: 1,
    availability: 'available',
    results: [title(9, 'tv')],
  });
  await userEvent.click(
    within(series).getByRole('button', { name: 'Try again' })
  );
  expect(
    await within(series).findByRole('link', { name: 'Title 9' })
  ).toBeVisible();
  expect(getRecommendations).toHaveBeenCalledTimes(3);
  await act(async () => {
    resolveMovies?.({
      category: 'popular-movies',
      candidateCount: 0,
      ...empty,
    });
  });
  await userEvent.click(tabs.getByRole('tab', { name: 'Movies' }));
  expect(
    screen.getByText('No recommendations are available right now.')
  ).toBeVisible();
  expect(getRecommendations).toHaveBeenCalledTimes(3);
});

it.each(['movies', 'series'] as const)(
  'excludes current %s and duplicates, retaining movie poster fallbacks without refilling',
  async (resource) => {
    const type = resource === 'movies' ? 'movie' : 'tv';
    vi.mocked(getRelatedTitles).mockResolvedValue({
      availability: 'partial',
      results: [
        title(1, type),
        title(2, type),
        title(2, type),
        { ...title(3, type), posterUrl: ' ' },
        { ...title(4, type), posterUrl: undefined },
      ],
    });
    render(wrap(<DetailRecommendations resource={resource} id={1} />));
    const section = screen.getByRole('region', {
      name: resource === 'movies' ? 'Similar Movies' : 'Similar Series',
    });
    const link = await within(section).findByRole('link', { name: 'Title 2' });

    expect(link).toHaveAttribute(
      'href',
      resource === 'movies' ? '/movie/2' : '/series/2'
    );
    expect(
      within(section).getAllByRole('link', { name: /Title/ })
    ).toHaveLength(resource === 'movies' ? 3 : 1);
    expect(within(section).getByAltText('Title 2')).toHaveAttribute(
      'loading',
      'lazy'
    );
    expect(getRelatedTitles).toHaveBeenCalledTimes(1);
    expect(getRelatedTitles).toHaveBeenCalledWith(
      resource,
      1,
      'similar',
      expect.any(AbortSignal)
    );
    expect(getRelatedTitles).not.toHaveBeenCalledWith(
      resource,
      1,
      'recommendations',
      expect.any(AbortSignal)
    );
  }
);

it('distinguishes missing posters from a successful empty source', async () => {
  vi.mocked(getRelatedTitles).mockResolvedValue({
    availability: 'available',
    results: [{ ...title(2), posterUrl: '' }],
  });
  render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  expect(
    await screen.findByText(
      'No recommendations with posters are available right now.'
    )
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Next/ })
  ).not.toBeInTheDocument();
});

it('keeps usable partial results if recovery fails', async () => {
  vi.mocked(getRelatedTitles)
    .mockResolvedValueOnce({ availability: 'partial', results: [title(2)] })
    .mockRejectedValueOnce(new ApiRequestError('timeout'));
  render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  expect(
    await screen.findByRole('link', { name: 'Title 2' })
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('The request took too long. Please try again.')
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Title 2' })).toBeInTheDocument();
  expect(
    screen.getByText('Some recommendations are unavailable.')
  ).toBeInTheDocument();
});

it('cancels rapid navigation and ignores a provider that resolves after cancellation', async () => {
  let resolveOld: ((value: RelatedTitlesResponse) => void) | undefined;
  vi.mocked(getRelatedTitles)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValue({ availability: 'available', results: [title(3)] });
  const { rerender } = render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  await waitFor(() => expect(getRelatedTitles).toHaveBeenCalledTimes(1));
  const oldSignal = vi.mocked(getRelatedTitles).mock.calls[0][3];

  rerender(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 2, kind: 'similar' }}
      />
    )
  );
  expect(
    await screen.findByRole('link', { name: 'Title 3' })
  ).toBeInTheDocument();
  await act(async () => {
    resolveOld?.({ availability: 'available', results: [title(9)] });
  });
  expect(oldSignal?.aborted).toBe(true);
  expect(
    screen.queryByRole('link', { name: 'Title 9' })
  ).not.toBeInTheDocument();
  expect(getRelatedTitles).toHaveBeenCalledTimes(2);
});

it('avoids duplicate StrictMode requests and rerender refetches', async () => {
  const node = wrap(
    <StrictMode>
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    </StrictMode>
  );
  const { rerender, unmount } = render(node);
  await screen.findByText('No recommendations are available right now.');
  rerender(node);
  expect(getRelatedTitles).toHaveBeenCalledTimes(1);
  const signal = vi.mocked(getRelatedTitles).mock.calls[0][3];

  unmount();
  expect(signal?.aborted).toBe(true);
});

it('defers offscreen resources until near the viewport', async () => {
  let notify: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }

      observe = vi.fn();

      disconnect = disconnect;
    }
  );
  render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  expect(getRelatedTitles).not.toHaveBeenCalled();
  await act(async () => {
    notify?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
  await screen.findByText('No recommendations are available right now.');
  expect(getRelatedTitles).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalled();
});

it('supports arrow buttons, native keyboard activation, scrolling edges and reduced motion', async () => {
  vi.mocked(getRelatedTitles).mockResolvedValue({
    availability: 'available',
    results: [title(2), title(3)],
  });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  const viewport = await screen.findByRole('region', {
    name: 'Scroll Similar Movies cards',
  });
  Object.defineProperties(viewport, {
    clientWidth: { value: 300 },
    scrollWidth: { value: 600 },
    scrollLeft: { value: 0, writable: true },
  });
  viewport.scrollBy = vi.fn();
  fireEvent.scroll(viewport);
  const next = screen.getByRole('button', { name: 'Next Similar Movies' });

  expect(
    screen.getByRole('button', { name: 'Previous Similar Movies' })
  ).toBeDisabled();
  next.focus();
  await userEvent.keyboard('{Enter}');
  expect(viewport.scrollBy).toHaveBeenCalledWith({
    left: 300,
    behavior: 'auto',
  });
  viewport.scrollLeft = 300;
  fireEvent.scroll(viewport);
  expect(next).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Previous Similar Movies' })
  ).toBeEnabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Previous Similar Movies' })
  );
  expect(viewport.scrollBy).toHaveBeenLastCalledWith({
    left: -300,
    behavior: 'auto',
  });
  // Touch is left to the browser's native overflow scrolling.
  expect(fireEvent.touchMove(viewport)).toBe(true);
});

it('pages by the card track plus one gap, excluding compensated hover insets', async () => {
  vi.mocked(getRelatedTitles).mockResolvedValue({
    availability: 'available',
    results: [title(2), title(3)],
  });
  render(
    wrap(
      <RecommendationRow
        title="Similar Movies"
        source={{ resource: 'movies', id: 1, kind: 'similar' }}
      />
    )
  );
  const viewport = await screen.findByRole('region', {
    name: 'Scroll Similar Movies cards',
  });
  const track = viewport.querySelector<HTMLElement>('.list__items');

  if (!track) {
    throw new Error('Expected the recommendation card track');
  }

  viewport.style.paddingLeft = '16px';
  viewport.style.paddingRight = '16px';
  track.style.columnGap = '20px';
  Object.defineProperties(viewport, {
    clientWidth: { value: 1132 },
    scrollWidth: { value: 2252 },
    scrollLeft: { value: 0, writable: true },
  });
  viewport.scrollBy = vi.fn();
  fireEvent.scroll(viewport);

  await userEvent.click(
    screen.getByRole('button', { name: 'Next Similar Movies' })
  );
  expect(viewport.scrollBy).toHaveBeenCalledWith({
    left: 1120,
    behavior: 'smooth',
  });
  viewport.scrollLeft = 1120;
  fireEvent.scroll(viewport);
  expect(
    screen.getByRole('button', { name: 'Next Similar Movies' })
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Previous Similar Movies' })
  );
  expect(viewport.scrollBy).toHaveBeenLastCalledWith({
    left: -1120,
    behavior: 'smooth',
  });
});
