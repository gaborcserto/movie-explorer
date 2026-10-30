import { useState } from 'react';
import type { SearchResult } from '@movie-explorer/contracts';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';

import { mediaPath } from '../../util/seriesRoutes';
import type { DiscoverSectionData } from './useDiscoverSection';
import './discover.scss';

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
      aria-label="Featured trending title"
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
        <p className="discover-featured__eyebrow">Movie Explorer presents</p>
        {item ? (
          <>
            <p className="discover-featured__type">
              {item.mediaType === 'movie' ? 'Movie' : 'Series'} · Trending now
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
              {item.rating !== undefined && (
                <span>★ {item.rating.toFixed(1)} / 10</span>
              )}
            </div>
            <p className="discover-featured__overview">
              {item.description?.trim() || 'Discover a story worth watching.'}
            </p>
            <Link
              className="discover-featured__link"
              to={mediaPath(item.mediaType, item.id)}
            >
              Explore title <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <>
            <h2>Find your next favorite.</h2>
            <p className="discover-featured__overview">
              Explore movies, series and the people who bring them to life.
            </p>
            <Link className="discover-featured__link" to="/search">
              Browse titles <span aria-hidden="true">→</span>
            </Link>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div
          className="discover-featured__navigation"
          aria-label="Featured titles"
        >
          <button
            type="button"
            className="lightbox-control"
            aria-label="Previous featured title"
            onClick={showPrevious}
          >
            <FaChevronLeft aria-hidden="true" focusable="false" />
          </button>
          <div
            className="discover-featured__indicators"
            role="group"
            aria-label="Choose featured title"
          >
            {items.map((entry, index) => (
              <button
                key={`${entry.mediaType}:${entry.id}`}
                type="button"
                aria-label={`Show ${entry.title}`}
                aria-current={selectedIndex === index ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button
            type="button"
            className="lightbox-control"
            aria-label="Next featured title"
            onClick={showNext}
          >
            <FaChevronRight aria-hidden="true" focusable="false" />
          </button>
        </div>
      )}
    </section>
  );
}
