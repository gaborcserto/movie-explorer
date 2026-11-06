import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useStore } from 'zustand';

import { i18n } from '../../i18n';
import Card from '../../components/card';
import '../../components/list/list.scss';
import PrimaryNavigation from '../../components/navigation';
import useStablePanelHeight from '../../hooks/useStablePanelHeight';
import {
  selectLibraryCollection,
  useLibraryStore,
} from '../../features/library/libraryStore';
import type { LibraryCollection } from '../../features/library/libraryStore';
import './libraryPage.scss';

const collections: { id: LibraryCollection; label: string }[] = [
  {
    id: 'favorites',
    get label() {
      return i18n.t('ui.favorites');
    },
  },
  {
    id: 'watched',
    get label() {
      return i18n.t('ui.watched');
    },
  },
];

const emptyMessages: Record<LibraryCollection, string> = {
  get watched() {
    return i18n.t('ui.you_have_not_marked_any_movies_or_series_as_watched_yet');
  },
  get favorites() {
    return i18n.t('ui.your_favorites_collection_is_empty');
  },
};

function isCollection(value: string | null): value is LibraryCollection {
  return collections.some((collection) => collection.id === value);
}

export default function LibraryPage() {
  useTranslation();

  const [searchParams] = useSearchParams();
  const activeCollectionLink = useRef<HTMLAnchorElement>(null);
  const requestedCollection = searchParams.get('collection');
  const activeCollection = isCollection(requestedCollection)
    ? requestedCollection
    : 'favorites';
  const collectionPanelRef =
    useStablePanelHeight<HTMLDivElement>(activeCollection);
  const items = useStore(
    useLibraryStore,
    selectLibraryCollection(activeCollection)
  );
  const allItems = useLibraryStore((state) => state.items);

  const focusActiveCollection = () => {
    activeCollectionLink.current?.focus();
  };

  return (
    <main className="library-page main" tabIndex={-1}>
      <div className="header page-hero header--movie-details library-page__hero" />
      <div className="search-toolbar list__container container">
        <div className="search-toolbar__content">
          <PrimaryNavigation mode="library" activeView="library" />
        </div>
      </div>
      <div className="list__container container library-page__content">
        <h1>{i18n.t('ui.personal_library')}</h1>
        <p className="library-page__description">
          {i18n.t('ui.your_saved_movies_and_series_all_in_one_place')}
        </p>
        <nav
          className="library-page__navigation"
          aria-label={i18n.t('ui.library_collections')}
        >
          {collections.map(({ id, label }) => {
            const count = Object.values(allItems).filter(
              (item) => item.collections[id]
            ).length;

            return (
              <Link
                key={id}
                to={`/library?collection=${id}`}
                ref={activeCollection === id ? activeCollectionLink : undefined}
                aria-current={activeCollection === id ? 'page' : undefined}
              >
                {label} <span>({count})</span>
              </Link>
            );
          })}
        </nav>
        <div
          ref={collectionPanelRef}
          className="library-page__collection-panel tab-panel-stable"
        >
          {items.length === 0 ? (
            <p className="library-page__empty" role="status">
              {emptyMessages[activeCollection]}
            </p>
          ) : (
            <section
              className="list__items"
              aria-label={i18n.t('messages.collectionItems', {
                collection: collections.find(
                  ({ id }) => id === activeCollection
                )?.label,
              })}
            >
              {items.map((item) => (
                <Card
                  key={item.key}
                  movie={{
                    id: item.id,
                    title: item.title,
                    posterUrl: item.posterUrl ?? '',
                    releaseDate: item.year ? `${item.year}` : undefined,
                    genres: [],
                  }}
                  destination={`/${item.mediaType === 'tv' ? 'series' : 'movie'}/${item.id}`}
                  displayDate={item.year ? `${item.year}` : undefined}
                  genreNavigation={false}
                  libraryMedia={{
                    mediaType: item.mediaType,
                    firstAirDate:
                      item.mediaType === 'tv' && item.year
                        ? `${item.year}`
                        : undefined,
                  }}
                  onLibraryMembershipRemoved={focusActiveCollection}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
