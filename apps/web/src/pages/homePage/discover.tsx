import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type {
  DiscoverySection,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';
import { FaClapperboard, FaPlay, FaTv } from 'react-icons/fa6';

import usePreferencesStore from '../../features/preferences/preferencesStore';
import { i18n } from '../../i18n';
import FeaturedHero from './featuredHero';
import HomeRecommendations from './homeRecommendations';
import DiscoverRow from './discoverSection';
import {
  useDiscoverSection,
  useStreamingProviderCatalog,
} from './useDiscoverSection';
import './discover.scss';

const categoryTabs = ['Trending', 'Popular', 'New', 'Upcoming'] as const;
type CategoryTab = (typeof categoryTabs)[number];
const categoryKeys = {
  Trending: 'ui.trending',
  Popular: 'ui.popular',
  New: 'ui.new',
  Upcoming: 'ui.upcoming',
} as const;

const movieSections: Record<CategoryTab, DiscoverySection> = {
  Trending: 'trending',
  Popular: 'popular-movies',
  New: 'new-movies',
  Upcoming: 'coming-soon',
};

const seriesSections: Record<CategoryTab, DiscoverySection> = {
  Trending: 'trending',
  Popular: 'popular-series',
  New: 'new-series',
  Upcoming: 'coming-soon',
};

const featuredProviders = [
  { label: 'Netflix', names: ['netflix'] },
  { label: 'SkyShowtime', names: ['skyshowtime'] },
  { label: 'Disney+', names: ['disneyplus', 'disney'] },
  { label: 'Max / HBO Max', names: ['max', 'hbomax'] },
  {
    label: 'Amazon Prime Video',
    names: ['amazonprimevideo', 'primevideo'],
  },
  { label: 'Apple TV+', names: ['appletvplus', 'appletv'] },
] as const;

function selectTabFromKeyboard(
  event: KeyboardEvent<HTMLButtonElement>,
  current: CategoryTab,
  setTab: (tab: CategoryTab) => void
) {
  const currentIndex = categoryTabs.indexOf(current);
  let nextIndex: number;

  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % categoryTabs.length;
  } else if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + categoryTabs.length) % categoryTabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = categoryTabs.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  setTab(categoryTabs[nextIndex]);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [nextIndex]?.focus();
}

function matchStreamingProviders(providers: StreamingProviderInfo[]) {
  return featuredProviders.flatMap(({ label, names }) => {
    const provider = providers.find((candidate) =>
      names.some(
        (name) =>
          name === candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      )
    );

    return provider ? [{ ...provider, label }] : [];
  });
}

function selectProviderFromKeyboard(
  event: KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  providers: Array<StreamingProviderInfo & { label: string }>,
  setProviderId: (providerId: number) => void
) {
  let nextIndex: number;

  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % providers.length;
  } else if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + providers.length) % providers.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = providers.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  setProviderId(providers[nextIndex].id);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [nextIndex]?.focus({ preventScroll: true });
}

export default function DiscoverPage() {
  useTranslation();

  const guestPreferences = usePreferencesStore((state) => state.preferences);
  const [movieTab, setMovieTab] = useState<CategoryTab>('Trending');
  const [seriesTab, setSeriesTab] = useState<CategoryTab>('Trending');
  const [requestedProviderId, setSelectedProviderId] = useState<number | null>(
    null
  );
  const [streamingMediaType, setStreamingMediaType] = useState<
    'all' | 'movie' | 'tv'
  >('all');
  const providerTabsRef = useRef<HTMLDivElement>(null);
  const providerCatalog = useStreamingProviderCatalog();
  const availableProviders = useMemo(
    () =>
      providerCatalog.state.status === 'success'
        ? matchStreamingProviders(providerCatalog.state.providers)
        : [],
    [providerCatalog.state]
  );

  const selectedProvider =
    availableProviders.find(
      (provider) => provider.id === requestedProviderId
    ) ?? availableProviders[0];
  const selectedProviderId = selectedProvider?.id ?? null;

  useEffect(() => {
    const providerTabs = providerTabsRef.current;
    const selectedTab = providerTabs?.querySelector<HTMLButtonElement>(
      '[aria-selected="true"]'
    );

    if (!providerTabs || !selectedTab) {
      return;
    }

    const tabsBounds = providerTabs.getBoundingClientRect();
    const selectedTabBounds = selectedTab.getBoundingClientRect();

    if (selectedTabBounds.left < tabsBounds.left) {
      providerTabs.scrollLeft -= tabsBounds.left - selectedTabBounds.left;
    } else if (selectedTabBounds.right > tabsBounds.right) {
      providerTabs.scrollLeft += selectedTabBounds.right - tabsBounds.right;
    }
  }, [selectedProviderId]);

  const featured = useDiscoverSection('trending');
  const movieData = useDiscoverSection(
    movieSections[movieTab],
    undefined,
    'movie'
  );
  const seriesData = useDiscoverSection(
    seriesSections[seriesTab],
    undefined,
    'tv'
  );
  const streamingProviderSelection = useMemo(
    () =>
      selectedProvider
        ? { id: selectedProvider.id, region: guestPreferences.region }
        : undefined,
    [selectedProvider, guestPreferences.region]
  );
  const streaming = useDiscoverSection(
    null,
    streamingProviderSelection,
    streamingMediaType === 'all' ? undefined : streamingMediaType
  );

  return (
    <div className="discover-page container">
      <div className="discover-page__content">
        <FeaturedHero data={featured} />
        <section className="discover-category" aria-labelledby="movies-heading">
          <div className="discover-category__heading">
            <h2 id="movies-heading">
              <FaClapperboard aria-hidden="true" />
              {i18n.t('ui.movies')}
            </h2>
            <div
              className="discover-category__tabs"
              role="tablist"
              aria-label={i18n.t('ui.movie_discovery_categories')}
            >
              {categoryTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  id={`movie-${tab.toLowerCase()}-tab`}
                  aria-controls="movies-row-panel"
                  aria-selected={movieTab === tab}
                  tabIndex={movieTab === tab ? 0 : -1}
                  key={i18n.t(categoryKeys[tab])}
                  onClick={() => setMovieTab(tab)}
                  onKeyDown={(event) =>
                    selectTabFromKeyboard(event, movieTab, setMovieTab)
                  }
                >
                  {i18n.t(categoryKeys[tab])}
                </button>
              ))}
            </div>
          </div>
          <DiscoverRow
            title={i18n.t('messages.discoveryMovies', {
              category: i18n.t(categoryKeys[movieTab]),
            })}
            id="movies-row"
            tabId={`movie-${movieTab.toLowerCase()}-tab`}
            data={movieData}
          />
        </section>
        <section className="discover-category" aria-labelledby="series-heading">
          <div className="discover-category__heading">
            <h2 id="series-heading">
              <FaTv aria-hidden="true" />
              {i18n.t('ui.series')}
            </h2>
            <div
              className="discover-category__tabs"
              role="tablist"
              aria-label={i18n.t('ui.series_discovery_categories')}
            >
              {categoryTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  id={`series-${tab.toLowerCase()}-tab`}
                  aria-controls="series-row-panel"
                  aria-selected={seriesTab === tab}
                  tabIndex={seriesTab === tab ? 0 : -1}
                  key={i18n.t(categoryKeys[tab])}
                  onClick={() => setSeriesTab(tab)}
                  onKeyDown={(event) =>
                    selectTabFromKeyboard(event, seriesTab, setSeriesTab)
                  }
                >
                  {i18n.t(categoryKeys[tab])}
                </button>
              ))}
            </div>
          </div>
          <DiscoverRow
            title={i18n.t('messages.discoverySeries', {
              category: i18n.t(categoryKeys[seriesTab]),
            })}
            id="series-row"
            tabId={`series-${seriesTab.toLowerCase()}-tab`}
            data={seriesData}
          />
        </section>
        <section
          className="discover-category"
          aria-labelledby="streaming-heading"
        >
          <div className="discover-category__heading">
            <h2 id="streaming-heading">
              <FaPlay aria-hidden="true" />
              {i18n.t('ui.streaming')}
            </h2>
            {providerCatalog.state.status === 'success' && (
              <div
                className="discover-category__tabs"
                role="tablist"
                aria-label={i18n.t(
                  'ui.streaming_providers_available_in_hungary'
                )}
                ref={providerTabsRef}
              >
                {availableProviders.map((provider, index) => (
                  <button
                    type="button"
                    role="tab"
                    id={`streaming-provider-${provider.id}-tab`}
                    aria-controls="streaming-row-panel"
                    aria-selected={provider.id === selectedProviderId}
                    tabIndex={provider.id === selectedProviderId ? 0 : -1}
                    key={provider.id}
                    onClick={() => setSelectedProviderId(provider.id)}
                    onKeyDown={(event) =>
                      selectProviderFromKeyboard(
                        event,
                        index,
                        availableProviders,
                        setSelectedProviderId
                      )
                    }
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="streaming-media-control"
            role="group"
            aria-label={i18n.t('ui.streaming_media_type')}
          >
            {(
              [
                ['all', i18n.t('ui.all')],
                ['movie', i18n.t('ui.movies')],
                ['tv', i18n.t('ui.series')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn"
                aria-pressed={streamingMediaType === value}
                onClick={() => setStreamingMediaType(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {providerCatalog.state.status === 'loading' && (
            <p className="discover-row__message" role="status">
              {i18n.t('ui.loading_streaming_providers')}
            </p>
          )}
          {providerCatalog.state.status === 'error' && (
            <p className="discover-row__message" role="alert">
              {i18n.t('ui.streaming_providers_could_not_load')}{' '}
              <button type="button" onClick={providerCatalog.retry}>
                {i18n.t('ui.try_again')}
              </button>
            </p>
          )}
          {providerCatalog.state.status === 'success' &&
            availableProviders.length === 0 && (
              <p className="discover-row__message" role="status">
                {i18n.t(
                  'ui.no_supported_streaming_providers_are_listed_for_hungary'
                )}
              </p>
            )}
          {providerCatalog.state.status === 'success' &&
            availableProviders.length > 0 && (
              <>
                {availableProviders.length < featuredProviders.length && (
                  <p className="discover-row__message">
                    {i18n.t('ui.providers_not_listed_for_hungary_are_omitted')}
                  </p>
                )}
                {selectedProvider && (
                  <DiscoverRow
                    title={i18n.t('messages.streamProvider', {
                      provider: selectedProvider.label,
                    })}
                    id="streaming-row"
                    tabId={`streaming-provider-${selectedProvider.id}-tab`}
                    data={streaming}
                  />
                )}
              </>
            )}
        </section>
        <HomeRecommendations />
      </div>
    </div>
  );
}
