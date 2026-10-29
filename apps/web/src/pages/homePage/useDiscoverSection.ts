import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DiscoverySection,
  SearchResponse,
  SearchResult,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import {
  getDiscoverySection,
  getStreamingProviderSection,
  getStreamingProviders,
} from '../../util/apiUtils';

const RESULTS_PER_BATCH = 5;
const MAX_INITIAL_PAGES = 3;
const MAX_PAGES_PER_LOAD_MORE = 3;
const MAX_DISCOVERY_PAGES = 20;

export interface StreamingProviderSelection {
  id: number;
  region: string;
}

type ProviderCatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; providers: StreamingProviderInfo[] };

export type SectionState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'success';
      results: SearchResult[];
      page: number;
      totalPages: number;
      visibleCount: number;
      loadingMore: boolean;
      loadMoreError: boolean;
    };

type SuccessfulSectionState = Extract<SectionState, { status: 'success' }>;

type DiscoveryMediaType = 'movie' | 'tv';

function isEligibleDiscoveryResult(
  result: SearchResult,
  mediaType?: DiscoveryMediaType
) {
  if (
    (result.mediaType !== 'movie' && result.mediaType !== 'tv') ||
    (mediaType && result.mediaType !== mediaType) ||
    !Number.isSafeInteger(result.id) ||
    result.id < 1
  ) {
    return false;
  }

  const { title, posterUrl } = result;

  // Dates and ratings remain optional for valid upcoming or unrated titles.
  return (
    title.trim().length > 0 &&
    typeof posterUrl === 'string' &&
    posterUrl.trim().length > 0
  );
}

function eligibleResults(
  results: SearchResult[],
  mediaType?: DiscoveryMediaType
) {
  return results.filter((result) =>
    isEligibleDiscoveryResult(result, mediaType)
  );
}

function appendUniqueResults(
  current: SearchResult[],
  incoming: SearchResult[]
) {
  const resultsById = new Map(
    current.map((result) => [`${result.mediaType}:${result.id}`, result])
  );

  incoming.forEach((result) => {
    const key = `${result.mediaType}:${result.id}`;

    if (!resultsById.has(key)) {
      resultsById.set(key, result);
    }
  });

  return [...resultsById.values()];
}

function firstPageState(
  response: SearchResponse,
  results: SearchResult[]
): SuccessfulSectionState {
  return {
    status: 'success',
    results,
    page: response.page,
    totalPages: Math.min(response.totalPages, MAX_DISCOVERY_PAGES),
    visibleCount: RESULTS_PER_BATCH,
    loadingMore: false,
    loadMoreError: false,
  };
}

function feedKey(
  section: DiscoverySection | null,
  provider?: StreamingProviderSelection,
  mediaType?: DiscoveryMediaType
) {
  if (provider) {
    return `streaming:${provider.region}:${provider.id}`;
  }

  if (section && mediaType) {
    return `${section}:${mediaType}`;
  }

  return section;
}

function fetchFeedPage(
  section: DiscoverySection | null,
  provider: StreamingProviderSelection | undefined,
  page: number,
  signal: AbortSignal
) {
  if (provider) {
    return getStreamingProviderSection(
      provider.id,
      provider.region,
      page,
      signal
    );
  }

  if (section) {
    return getDiscoverySection(section, signal, page);
  }

  return Promise.reject(new Error('A discovery feed is required'));
}

async function fetchAdditionalPages(
  section: DiscoverySection | null,
  provider: StreamingProviderSelection | undefined,
  mediaType: DiscoveryMediaType | undefined,
  signal: AbortSignal,
  nextPage: number,
  totalPages: number,
  pageLimit: number,
  resultsNeeded: number,
  loadedPages = 0,
  results: SearchResult[] = []
): Promise<{ response?: SearchResponse; results: SearchResult[] }> {
  if (
    nextPage > totalPages ||
    loadedPages >= pageLimit ||
    results.length >= resultsNeeded
  ) {
    return { results };
  }

  const response = await fetchFeedPage(section, provider, nextPage, signal);
  const nextResults = appendUniqueResults(
    results,
    eligibleResults(response.results, mediaType)
  );

  if (nextResults.length >= resultsNeeded) {
    return { response, results: nextResults };
  }

  const followingPages = await fetchAdditionalPages(
    section,
    provider,
    mediaType,
    signal,
    response.page + 1,
    totalPages,
    pageLimit,
    resultsNeeded,
    loadedPages + 1,
    nextResults
  );

  return {
    response: followingPages.response ?? response,
    results: followingPages.results,
  };
}

export function useDiscoverSection(
  section: DiscoverySection | null,
  provider?: StreamingProviderSelection,
  mediaType?: DiscoveryMediaType
) {
  const key = feedKey(section, provider, mediaType);
  const [state, setState] = useState<SectionState>({ status: 'loading' });
  const [stateKey, setStateKey] = useState(key);
  const [attempt, setAttempt] = useState(0);
  const pageCache = useRef(new Map<string, SuccessfulSectionState>());
  const loadingMoreRef = useRef(false);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStateKey(key);
    loadingMoreRef.current = false;
    moreController.current?.abort();

    if (key) {
      const cached = pageCache.current.get(key);

      if (cached) {
        setState(cached);
      } else {
        setState({ status: 'loading' });
        const loadInitialResults = async () => {
          const response = await fetchFeedPage(
            section,
            provider,
            1,
            controller.signal
          );
          const totalPages = Math.min(response.totalPages, MAX_DISCOVERY_PAGES);
          const initialResults = eligibleResults(response.results, mediaType);

          if (initialResults.length >= RESULTS_PER_BATCH) {
            return { response, results: initialResults };
          }

          const additionalPages = await fetchAdditionalPages(
            section,
            provider,
            mediaType,
            controller.signal,
            response.page + 1,
            totalPages,
            MAX_INITIAL_PAGES - 1,
            RESULTS_PER_BATCH,
            0,
            initialResults
          );

          return {
            response: additionalPages.response ?? response,
            results: additionalPages.results,
          };
        };

        loadInitialResults()
          .then(({ response, results }) => {
            if (controller.signal.aborted) {
              return;
            }

            const nextState = firstPageState(response, results);
            pageCache.current.set(key, nextState);
            setState(nextState);
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setState({ status: 'error' });
            }
          });
      }
    }

    return () => {
      controller.abort();
      moreController.current?.abort();
      moreController.current = null;
      loadingMoreRef.current = false;
    };
  }, [attempt, key, mediaType, provider, section]);

  const loadMore = useCallback(async () => {
    if (!key || state.status !== 'success' || loadingMoreRef.current) {
      return;
    }

    if (state.visibleCount < state.results.length) {
      const nextState = {
        ...state,
        visibleCount: Math.min(
          state.visibleCount + RESULTS_PER_BATCH,
          state.results.length
        ),
        loadMoreError: false,
      };
      pageCache.current.set(key, nextState);
      setState(nextState);

      return;
    }

    if (state.page >= state.totalPages) {
      return;
    }

    const controller = new AbortController();
    moreController.current = controller;
    loadingMoreRef.current = true;
    setState({ ...state, loadingMore: true, loadMoreError: false });

    try {
      const { results: existingResults } = state;
      const neededCount = state.visibleCount + RESULTS_PER_BATCH;
      const { response, results } = await fetchAdditionalPages(
        section,
        provider,
        mediaType,
        controller.signal,
        state.page + 1,
        state.totalPages,
        MAX_PAGES_PER_LOAD_MORE,
        neededCount,
        0,
        existingResults
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!response) {
        setState({ ...state, loadingMore: false });

        return;
      }

      const nextState: SuccessfulSectionState = {
        ...state,
        results,
        page: response.page,
        totalPages: Math.min(response.totalPages, MAX_DISCOVERY_PAGES),
        visibleCount: state.visibleCount + RESULTS_PER_BATCH,
        loadingMore: false,
        loadMoreError: false,
      };
      pageCache.current.set(key, nextState);
      setState(nextState);
    } catch {
      if (!controller.signal.aborted) {
        setState((current) =>
          current.status === 'success'
            ? { ...current, loadingMore: false, loadMoreError: true }
            : current
        );
      }
    } finally {
      if (moreController.current === controller) {
        moreController.current = null;
        loadingMoreRef.current = false;
      }
    }
  }, [key, mediaType, provider, section, state]);

  const retry = useCallback(() => {
    if (state.status === 'success' && state.loadMoreError) {
      loadMore();
    } else {
      if (key) {
        pageCache.current.delete(key);
      }
      setAttempt((current) => current + 1);
    }
  }, [key, loadMore, state]);

  return {
    state: stateKey === key ? state : ({ status: 'loading' } as const),
    retry,
    loadMore,
  };
}

export type DiscoverSectionData = ReturnType<typeof useDiscoverSection>;

export function useStreamingProviderCatalog() {
  const [state, setState] = useState<ProviderCatalogState>({
    status: 'loading',
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: 'loading' });
    getStreamingProviders('HU', controller.signal)
      .then((providers) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', providers });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' });
        }
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
