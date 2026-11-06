import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { SearchResult } from '@movie-explorer/contracts';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';

import { i18n } from '../../../i18n';
import { CardRating } from '../../../components/card';
import { mediaPath } from '../../../util/seriesRoutes';
import type { DiscoverSectionData } from '../useDiscoverSection';
import '../discover.scss';

function featuredTitle(
  item: SearchResult
): item is Extract<SearchResult, { mediaType: 'movie' | 'tv' }> {
  return item.mediaType === 'movie' || item.mediaType === 'tv';
}

export default function FeaturedHero({
  data: { state },
}: {
  data: DiscoverSectionData;
}) {
  useTranslation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImageKey, setFailedImageKey] = useState<string>();

  const items =
    state.status === 'success'
      ? state.results
          .filter(featuredTitle)
          .filter((item) => item.backdropUrl)
          .slice(0, 5)
      : [];
  const selectedIndex = items.length ? activeIndex % items.length : 0;
  const item = items[selectedIndex];
  const itemKey = item ? `${item.mediaType}:${item.id}` : undefined;

  const showPrevious = () =>
    setActiveIndex((current) => (current - 1 + items.length) % items.length);

  const showNext = () =>
    setActiveIndex((current) => (current + 1) % items.length);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    const { target } = event;
    const isCarouselControl =
      target instanceof Element &&
      target.closest('.discover-featured__navigation') !== null;

    if (target !== event.currentTarget && !isCarouselControl) {
      return;
    }

    event.preventDefault();

    if (event.key === 'ArrowLeft') {
      showPrevious();
    } else {
      showNext();
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Focusable carousel region handles its own arrow-key navigation.
    <section
      className="discover-featured"
      aria-label={i18n.t('ui.featured_trending_title')}
      aria-roledescription="carousel"
      tabIndex={items.length > 1 ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="discover-featured__visual" aria-hidden="true">
        {items.map((entry, index) => {
          const entryKey = `${entry.mediaType}:${entry.id}`;

          return failedImageKey !== entryKey ? (
            <img
              key={entryKey}
              className={`discover-featured__image${index === selectedIndex ? ' discover-featured__image--active' : ''}`}
              src={entry.backdropUrl ?? undefined}
              alt=""
              loading="eager"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={() => setFailedImageKey(entryKey)}
            />
          ) : null;
        })}
      </div>
      <div className="discover-featured__content" key={itemKey ?? 'fallback'}>
        <p className="discover-featured__eyebrow">
          {i18n.t('ui.movie_explorer_presents')}
        </p>
        {item ? (
          <>
            <p className="discover-featured__type">
              {item.mediaType === 'movie'
                ? i18n.t('ui.movie')
                : i18n.t('ui.series')}{' '}
              {i18n.t('messages.nowTrending')}
            </p>
            <h2>{item.title}</h2>
            <div className="discover-featured__metadata">
              {(item.mediaType === 'movie'
                ? item.releaseDate
                : item.firstAirDate) && (
                <span>
                  {(item.mediaType === 'movie'
                    ? item.releaseDate
                    : item.firstAirDate
                  )?.slice(0, 4)}
                </span>
              )}
              <CardRating
                rating={item.rating}
                className="discover-featured__rating"
              />
            </div>
            <p className="discover-featured__overview">
              {item.description?.trim() ||
                i18n.t('ui.discover_a_story_worth_watching')}
            </p>
            <Link
              className="discover-featured__link"
              to={mediaPath(item.mediaType, item.id)}
            >
              {i18n.t('ui.explore_title')} <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <>
            <h2>{i18n.t('ui.find_your_next_favorite')}</h2>
            <p className="discover-featured__overview">
              {i18n.t(
                'ui.explore_movies_series_and_the_people_who_bring_them_to_life'
              )}
            </p>
            <Link className="discover-featured__link" to="/search">
              {i18n.t('ui.browse_titles')} <span aria-hidden="true">→</span>
            </Link>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div
          className="discover-featured__navigation"
          aria-label={i18n.t('ui.featured_titles')}
        >
          <button
            type="button"
            className="lightbox-control"
            aria-label={i18n.t('ui.previous_featured_title')}
            onClick={showPrevious}
          >
            <FaChevronLeft aria-hidden="true" focusable="false" />
          </button>
          <div
            className="discover-featured__indicators"
            role="group"
            aria-label={i18n.t('ui.choose_featured_title')}
          >
            {items.map((entry, index) => (
              <button
                key={`${entry.mediaType}:${entry.id}`}
                type="button"
                aria-label={i18n.t('messages.showTitle', {
                  title: entry.title,
                })}
                aria-current={selectedIndex === index ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button
            type="button"
            className="lightbox-control"
            aria-label={i18n.t('ui.next_featured_title')}
            onClick={showNext}
          >
            <FaChevronRight aria-hidden="true" focusable="false" />
          </button>
        </div>
      )}
    </section>
  );
}
