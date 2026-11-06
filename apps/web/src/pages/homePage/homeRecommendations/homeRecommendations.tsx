import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaCompass } from 'react-icons/fa6';

import { i18n } from '../../../i18n';
import RecommendationRow from '../../../components/recommendationRow';
import {
  LIBRARY_STORAGE_KEY,
  useLibraryStore,
} from '../../../features/library/libraryStore';
import type { LibraryItem } from '../../../features/library/libraryStore';
import type { RecommendationSource } from '../../../components/recommendationRow';

const tabs = [
  {
    value: 'movies',
    get label() {
      return i18n.t('ui.movies');
    },
  },
  {
    value: 'series',
    get label() {
      return i18n.t('ui.series');
    },
  },
] as const;
type RecommendationTab = (typeof tabs)[number]['value'];

function librarySignature(
  items: Record<string, LibraryItem>,
  mediaType: 'movie' | 'tv'
) {
  const titles = Object.values(items)
    .filter((item) => item.mediaType === mediaType)
    .sort((a, b) => a.id - b.id);

  return JSON.stringify({
    favorites: titles
      .filter((item) => item.collections.favorites)
      .map((item) => item.id),
    excluded: titles
      .filter((item) => item.collections.favorites || item.collections.watched)
      .map((item) => item.id),
  });
}

function recommendationSource(
  libraryKey: string,
  mediaType: 'movie' | 'tv'
): RecommendationSource {
  const library: { favorites: number[]; excluded: number[] } =
    JSON.parse(libraryKey);
  const count = Math.min(3, library.favorites.length);
  // Spread seeds across sorted IDs, independent of insertion order and snapshot edits.
  const favoriteIds = Array.from(
    { length: count },
    (_, index) =>
      library.favorites[
        count === 1
          ? 0
          : Math.floor((index * (library.favorites.length - 1)) / (count - 1))
      ]
  );

  return {
    category: mediaType === 'movie' ? 'popular-movies' : 'popular-series',
    libraryKey,
    ...(favoriteIds.length || library.excluded.length
      ? {
          preferences: {
            mediaType,
            favoriteIds,
            excludedIds: library.excluded,
          },
        }
      : {}),
  };
}

export default function HomeRecommendations() {
  useTranslation();

  const [selected, setSelected] = useState<RecommendationTab>('movies');
  const [visited, setVisited] = useState<RecommendationTab[]>(['movies']);
  const groupId = 'recommendations';
  const movieLibrary = useLibraryStore((state) =>
    librarySignature(state.items, 'movie')
  );
  const seriesLibrary = useLibraryStore((state) =>
    librarySignature(state.items, 'tv')
  );
  const movieSource = useMemo(
    () => recommendationSource(movieLibrary, 'movie'),
    [movieLibrary]
  );
  const seriesSource = useMemo(
    () => recommendationSource(seriesLibrary, 'tv'),
    [seriesLibrary]
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.storageArea === window.localStorage &&
        (event.key === LIBRARY_STORAGE_KEY || event.key === null)
      ) {
        useLibraryStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorage);
    useLibraryStore.persist.rehydrate();

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const select = (tab: RecommendationTab) => {
    setSelected(tab);
    setVisited((previous) =>
      previous.includes(tab) ? previous : [...previous, tab]
    );
  };

  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: RecommendationTab;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      next = selected === 'movies' ? 'series' : 'movies';
    } else if (event.key === 'Home') {
      next = 'movies';
    } else if (event.key === 'End') {
      next = 'series';
    } else {
      return;
    }

    event.preventDefault();
    select(next);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[id="${groupId}-${next}-tab"]`)
      ?.focus({ preventScroll: true });
  };

  return (
    <section
      className="home-recommendations discover-category"
      aria-labelledby={`${groupId}-heading`}
    >
      <div className="discover-category__heading">
        <h2 id={`${groupId}-heading`}>
          <FaCompass aria-hidden="true" /> {i18n.t('ui.recommendations')}
        </h2>
        <div
          className="discover-category__tabs"
          role="tablist"
          aria-label={i18n.t('ui.recommendation_categories')}
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`${groupId}-${tab.value}-tab`}
              aria-controls={`${groupId}-${tab.value}-panel`}
              aria-selected={selected === tab.value}
              tabIndex={selected === tab.value ? 0 : -1}
              onClick={() => select(tab.value)}
              onKeyDown={selectFromKeyboard}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          id={`${groupId}-${tab.value}-panel`}
          role="tabpanel"
          aria-labelledby={`${groupId}-${tab.value}-tab`}
          tabIndex={0}
          hidden={selected !== tab.value}
        >
          {visited.includes(tab.value) && (
            <RecommendationRow
              title={i18n.t('messages.popularCategory', {
                category: tab.label,
              })}
              source={tab.value === 'movies' ? movieSource : seriesSource}
              home
            />
          )}
        </div>
      ))}
    </section>
  );
}
